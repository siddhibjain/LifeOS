import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Bell, AlertTriangle, Clock, Upload, Sparkles, MessageSquareText,
  ListChecks, Plus, ArrowRight, TrendingUp, FolderOpen, ListTodo, GitBranch,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { listDocuments, listReminders, listTasks, listDependencies } from '@/lib/services';
import { generateLifeInsights, localInsights, localDeadlineBriefing } from '@/lib/ai';
import { DocumentRecord, Reminder, LifeInsight, AppRoute, Category, Task, TaskDependency } from '@/lib/types';
import { greeting, formatDate, daysUntil, relativeTime, cn } from '@/lib/utils';
import { CATEGORY_META } from '@/lib/categories';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';

interface DashboardProps {
  onNavigate: (r: AppRoute) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [insights, setInsights] = useState<LifeInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(true);

  const name = profile?.full_name || user?.user_metadata?.full_name || 'there';

  const load = useCallback(async () => {
    setLoading(true);
    setInsightsLoading(true);
    try {
      const [d, r, t, dp] = await Promise.all([listDocuments(), listReminders(), listTasks(), listDependencies()]);
      setDocs(d);
      setReminders(r);
      setTasks(t);
      setDeps(dp);
      // Merge local insights (docs/reminders) with deadline briefing (tasks/deps)
      const docInsights = localInsights(d, r);
      const taskBriefing = localDeadlineBriefing(t, dp, d, r);
      const merged = [...taskBriefing, ...docInsights].slice(0, 8) as LifeInsight[];
      setInsights(merged);
      setInsightsLoading(false);
      try {
        const res = await generateLifeInsights();
        setAiAvailable(res.available);
        if (res.available && res.insights.length > 0) setInsights(res.insights);
      } catch { /* keep local insights */ }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load dashboard data.', 'error');
    } finally {
      setLoading(false);
      setInsightsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const pendingReminders = reminders.filter(r => r.status === 'pending');
  const overdue = pendingReminders.filter(r => { const d = daysUntil(r.due_date); return d !== null && d < 0; });
  const upcoming = pendingReminders.filter(r => { const d = daysUntil(r.due_date); return d !== null && d >= 0 && d <= 30; });
  const expiringDocs = docs.filter(d => { const days = daysUntil(d.expiry_date); return days !== null && days <= 90; });
  const recentDocs = docs.slice(0, 5);
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const categoryCounts = docs.reduce<Record<string, number>>((acc, d) => { acc[d.category] = (acc[d.category] || 0) + 1; return acc; }, {});

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      </div>
    );
  }

  if (docs.length === 0 && reminders.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="font-serif text-2xl sm:text-3xl text-espresso">{greeting()}, {name}.</h2>
          <p className="text-taupe text-sm mt-1">Here's your life at a glance.</p>
        </div>
        <div className="card p-8 sm:p-12">
          <EmptyState
            icon={<FolderOpen size={28} />}
            title="Welcome to your LifeOS"
            description="Upload your first document and LifeOS will organize it, extract the important details, and start generating insights tailored to you."
            action={<button className="btn-gold" onClick={() => onNavigate('documents')}><Upload size={16} /> Upload your first document</button>}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {[
            { icon: MessageSquareText, label: 'Ask your documents', route: 'ask' as AppRoute, text: 'Chat with your archive' },
            { icon: Bell, label: 'Set a reminder', route: 'reminders' as AppRoute, text: 'Never miss a deadline' },
            { icon: ListChecks, label: 'Generate a checklist', route: 'checklists' as AppRoute, text: 'Prepare for any situation' },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.route)} className="card p-5 text-left hover:shadow-lift transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-champagne/12 flex items-center justify-center text-champagne-dark mb-3">
                <a.icon size={18} />
              </div>
              <p className="font-medium text-espresso text-sm">{a.label}</p>
              <p className="text-xs text-taupe mt-0.5">{a.text}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      <div className="mb-6 animate-fade-in">
        <h2 className="font-serif text-2xl sm:text-3xl text-espresso">{greeting()}, {name}.</h2>
        <p className="text-taupe text-sm mt-1">Here's your life at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={FileText} label="Documents" value={docs.length} tone="champagne" onClick={() => onNavigate('documents')} />
        <StatCard icon={ListTodo} label="Active tasks" value={activeTasks.length} tone="sage" onClick={() => onNavigate('actions')} />
        <StatCard icon={AlertTriangle} label="Expiring" value={expiringDocs.length} tone="rose" onClick={() => onNavigate('documents')} />
        <StatCard icon={Bell} label="Pending" value={pendingReminders.length} tone="espresso" onClick={() => onNavigate('reminders')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-champagne/15 flex items-center justify-center">
                  <Sparkles size={17} className="text-champagne-dark" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-espresso">Your LifeOS Insights</h3>
                  {!aiAvailable && <p className="text-[11px] text-taupe">Showing rule-based insights</p>}
                </div>
              </div>
              <button onClick={load} className="text-xs text-taupe hover:text-espresso transition-colors">Refresh</button>
            </div>

            {insightsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : insights.length === 0 ? (
              <div className="py-8 text-center">
                <TrendingUp size={28} className="mx-auto text-sage mb-2" />
                <p className="text-sm text-espresso font-medium">All clear</p>
                <p className="text-xs text-taupe mt-1">No documents need attention right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {insights.map(ins => (
                  <InsightCard
                    key={ins.id}
                    insight={ins}
                    onClick={() => {
                      if (ins.task_id) onNavigate('actions');
                      else if (ins.document_id) onNavigate('documents');
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg text-espresso">Recently uploaded</h3>
              <button onClick={() => onNavigate('documents')} className="text-xs text-champagne-dark hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            {recentDocs.length === 0 ? (
              <p className="text-sm text-taupe py-4">No documents yet.</p>
            ) : (
              <div className="space-y-2">
                {recentDocs.map(d => <RecentDocRow key={d.id} doc={d} onClick={() => onNavigate('documents')} />)}
              </div>
            )}
          </div>

          {docs.length > 0 && (
            <div className="card p-5 sm:p-6">
              <h3 className="font-serif text-lg text-espresso mb-4">Document categories</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(CATEGORY_META) as Category[]).map(cat => {
                  const count = categoryCounts[cat] || 0;
                  const meta = CATEGORY_META[cat];
                  return (
                    <button key={cat} onClick={() => onNavigate('documents')} className="rounded-xl border border-espresso/5 bg-ivory-2/40 p-4 text-left hover:bg-ivory-2 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                        <span className="text-xl font-serif text-espresso">{count}</span>
                      </div>
                      <p className="text-xs text-taupe">{meta.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5 sm:p-6">
            <h3 className="font-serif text-lg text-espresso mb-4">Quick actions</h3>
            <div className="space-y-2">
              <QuickAction icon={Upload} label="Upload document" onClick={() => onNavigate('documents')} />
              <QuickAction icon={ListTodo} label="Action Center" onClick={() => onNavigate('actions')} />
              <QuickAction icon={GitBranch} label="LifeGraph" onClick={() => onNavigate('lifegraph')} />
              <QuickAction icon={MessageSquareText} label="Ask AI" onClick={() => onNavigate('ask')} />
              <QuickAction icon={Plus} label="Create reminder" onClick={() => onNavigate('reminders')} />
              <QuickAction icon={ListChecks} label="Generate checklist" onClick={() => onNavigate('checklists')} />
            </div>
          </div>

          {overdue.length > 0 && (
            <div className="card p-5 sm:p-6 border-rose/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-rose" />
                <h3 className="font-medium text-espresso text-sm">Overdue reminders</h3>
              </div>
              <div className="space-y-2">
                {overdue.slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-espresso truncate">{r.title}</span>
                    <span className="text-xs text-rose shrink-0 ml-2">{formatDate(r.due_date)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => onNavigate('reminders')} className="text-xs text-champagne-dark hover:underline mt-3">Review all reminders</button>
            </div>
          )}

          {recentDocs.length > 0 && (
            <div className="card p-5 sm:p-6">
              <h3 className="font-serif text-lg text-espresso mb-4">Recent activity</h3>
              <div className="space-y-3">
                {recentDocs.slice(0, 4).map(d => (
                  <div key={d.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-ivory-2 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-taupe" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-espresso truncate">{d.document_name}</p>
                      <p className="text-xs text-taupe">Added {relativeTime(d.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, onClick }: {
  icon: typeof FileText; label: string; value: number; tone: 'champagne' | 'sage' | 'rose' | 'espresso'; onClick: () => void;
}) {
  const tones: Record<string, string> = {
    champagne: 'bg-champagne/12 text-champagne-dark',
    sage: 'bg-sage/12 text-sage',
    rose: 'bg-rose/12 text-rose',
    espresso: 'bg-espresso/8 text-espresso',
  };
  return (
    <button onClick={onClick} className="card p-4 sm:p-5 text-left hover:shadow-lift transition-shadow">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', tones[tone])}>
        <Icon size={18} />
      </div>
      <p className="text-2xl sm:text-3xl font-serif text-espresso">{value}</p>
      <p className="text-xs text-taupe mt-0.5">{label}</p>
    </button>
  );
}

function InsightCard({ insight, onClick }: { insight: LifeInsight; onClick: () => void }) {
  const styles = {
    alert: { bg: 'bg-rose/8', border: 'border-rose/20', icon: AlertTriangle, color: 'text-rose' },
    warning: { bg: 'bg-champagne/8', border: 'border-champagne/20', icon: Clock, color: 'text-champagne-dark' },
    info: { bg: 'bg-sage/8', border: 'border-sage/20', icon: Sparkles, color: 'text-sage' },
  };
  const s = styles[insight.severity];
  return (
    <button onClick={onClick} className={cn('w-full text-left rounded-xl border p-4 transition-shadow hover:shadow-soft', s.bg, s.border)}>
      <div className="flex items-start gap-3">
        <s.icon size={16} className={cn('mt-0.5 shrink-0', s.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-espresso">{insight.title}</p>
          <p className="text-xs text-taupe mt-0.5 leading-relaxed">{insight.detail}</p>
        </div>
      </div>
    </button>
  );
}

function RecentDocRow({ doc, onClick }: { doc: DocumentRecord; onClick: () => void }) {
  const meta = CATEGORY_META[doc.category];
  const days = daysUntil(doc.expiry_date);
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-ivory-2/60 transition-colors text-left">
      <div className="w-10 h-10 rounded-lg bg-ivory-2 flex items-center justify-center shrink-0">
        <FileText size={18} className="text-taupe" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-espresso truncate">{doc.document_name}</p>
        <p className="text-xs text-taupe">
          <span className={cn('chip', meta.bg, meta.text, 'px-2 py-0.5 mr-1.5')}>{meta.label}</span>
          {relativeTime(doc.created_at)}
        </p>
      </div>
      {days !== null && days <= 30 && (
        <span className={cn('text-xs shrink-0', days < 0 ? 'text-rose' : 'text-champagne-dark')}>
          {days < 0 ? 'Expired' : `${days}d`}
        </span>
      )}
    </button>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof FileText; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-ivory-2/60 transition-colors text-left group">
      <div className="w-9 h-9 rounded-xl bg-ivory-2 flex items-center justify-center text-espresso/70 group-hover:bg-champagne/15 group-hover:text-champagne-dark transition-colors">
        <Icon size={17} />
      </div>
      <span className="text-sm text-espresso flex-1">{label}</span>
      <ArrowRight size={14} className="text-taupe group-hover:text-champagne-dark transition-colors" />
    </button>
  );
}
