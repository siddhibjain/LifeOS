import { useEffect, useState, useCallback } from 'react';
import {
  Bell, Plus, Trash2, Pencil, Check, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import {
  listReminders, createReminder, updateReminder, deleteReminder, listDocuments,
} from '@/lib/services';
import { Reminder, ReminderType, Priority, DocumentRecord, REMINDER_TYPES, PRIORITIES } from '@/lib/types';
import { cn, formatDate, daysUntil } from '@/lib/utils';
import { REMINDER_TYPE_META, PRIORITY_META } from '@/lib/categories';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

type Tab = 'upcoming' | 'overdue' | 'completed' | 'calendar';

export function Reminders() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([listReminders(), listDocuments()]);
      setReminders(r);
      setDocs(d);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load reminders.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const pending = reminders.filter(r => r.status === 'pending');
  const overdue = pending.filter(r => { const d = daysUntil(r.due_date); return d !== null && d < 0; });
  const upcoming = pending.filter(r => { const d = daysUntil(r.due_date); return d !== null && d >= 0; })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const completed = reminders.filter(r => r.status === 'completed');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'overdue', label: 'Overdue', count: overdue.length },
    { key: 'completed', label: 'Completed', count: completed.length },
    { key: 'calendar', label: 'Calendar', count: 0 },
  ];

  async function handleToggleComplete(r: Reminder) {
    try {
      const updated = await updateReminder(r.id, { status: r.status === 'pending' ? 'completed' : 'pending' });
      setReminders(prev => prev.map(x => x.id === updated.id ? updated : x));
      toast(r.status === 'pending' ? 'Reminder completed.' : 'Reminder reopened.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed.', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteReminder(deleteTarget.id);
      setReminders(prev => prev.filter(r => r.id !== deleteTarget.id));
      toast('Reminder deleted.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  }

  function handleSaved(r: Reminder) {
    setReminders(prev => {
      const exists = prev.find(x => x.id === r.id);
      return exists ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev];
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-espresso">Reminders</h2>
          <p className="text-taupe text-sm mt-1">Stay on top of deadlines and renewals.</p>
        </div>
        <button className="btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> <span className="hidden sm:inline">New reminder</span>
        </button>
      </div>

      <div className="flex gap-1 mb-5 overflow-x-auto no-scrollbar border-b border-espresso/5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
              tab === t.key ? 'border-champagne text-espresso' : 'border-transparent text-taupe hover:text-espresso',
            )}
          >
            {t.label}
            {t.count > 0 && <span className={cn('ml-1.5 text-xs', t.key === 'overdue' ? 'text-rose' : 'text-taupe')}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : tab === 'calendar' ? (
        <CalendarView reminders={reminders} month={calMonth}
          onPrev={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          onNext={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} />
      ) : (
        (() => {
          const list = tab === 'upcoming' ? upcoming : tab === 'overdue' ? overdue : completed;
          if (list.length === 0) {
            return (
              <div className="card">
                <EmptyState
                  icon={<Bell size={26} />}
                  title={tab === 'completed' ? 'No completed reminders' : tab === 'overdue' ? 'Nothing overdue' : 'No upcoming reminders'}
                  description={tab === 'completed' ? 'Completed reminders will appear here.' : 'Create a reminder to track an important deadline.'}
                  action={tab !== 'completed' && <button className="btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> New reminder</button>}
                />
              </div>
            );
          }
          return (
            <div className="space-y-2.5">
              {list.map(r => (
                <ReminderRow key={r.id} reminder={r} onToggle={() => handleToggleComplete(r)}
                  onEdit={() => { setEditing(r); setShowForm(true); }} onDelete={() => setDeleteTarget(r)} />
              ))}
            </div>
          );
        })()
      )}

      <ReminderForm open={showForm} reminder={editing} docs={docs} onClose={() => setShowForm(false)} onSaved={(r) => { handleSaved(r); setShowForm(false); }} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete reminder?"
        message={`"${deleteTarget?.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ReminderRow({ reminder: r, onToggle, onEdit, onDelete }: {
  reminder: Reminder; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const days = daysUntil(r.due_date);
  const typeMeta = REMINDER_TYPE_META[r.reminder_type];
  const priMeta = PRIORITY_META[r.priority];
  const isOverdue = days !== null && days < 0 && r.status === 'pending';

  return (
    <div className={cn('card p-4 flex items-center gap-3', r.status === 'completed' && 'opacity-60')}>
      <button
        onClick={onToggle}
        className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          r.status === 'completed' ? 'bg-sage border-sage text-white' : 'border-taupe/40 hover:border-sage')}
        aria-label="Toggle complete"
      >
        {r.status === 'completed' && <Check size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-espresso truncate', r.status === 'completed' && 'line-through')}>{r.title}</p>
        {r.description && <p className="text-xs text-taupe truncate mt-0.5">{r.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={cn('chip', typeMeta.bg, typeMeta.text)}>{typeMeta.label}</span>
          <span className={cn('chip', priMeta.bg, priMeta.text)}>{priMeta.label}</span>
          {r.documents?.document_name && <span className="chip bg-ivory-2 text-taupe">{r.documents.document_name}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-medium', isOverdue ? 'text-rose' : 'text-espresso')}>{formatDate(r.due_date)}</p>
        {r.status === 'pending' && days !== null && (
          <p className={cn('text-xs', isOverdue ? 'text-rose' : days <= 7 ? 'text-champagne-dark' : 'text-taupe')}>
            {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`}
          </p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={onEdit} className="p-2 text-taupe hover:text-espresso rounded-lg hover:bg-ivory-2 transition-colors" aria-label="Edit"><Pencil size={14} /></button>
        <button onClick={onDelete} className="p-2 text-taupe hover:text-rose rounded-lg hover:bg-rose/8 transition-colors" aria-label="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function CalendarView({ reminders, month, onPrev, onNext }: {
  reminders: Reminder[]; month: Date; onPrev: () => void; onNext: () => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const monthName = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const byDate = new Map<string, Reminder[]>();
  for (const r of reminders) {
    const key = r.due_date.slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(r);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-serif text-lg text-espresso">{monthName}</h3>
        <div className="flex gap-1">
          <button onClick={onPrev} className="btn-ghost p-2"><ChevronLeft size={16} /></button>
          <button onClick={onNext} className="btn-ghost p-2"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-center text-xs text-taupe font-medium py-2">{d}</div>)}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayReminders = byDate.get(dateStr) || [];
          const isToday = new Date(year, m, day).getTime() === today.getTime();
          return (
            <div key={i} className={cn('min-h-[56px] sm:min-h-[72px] rounded-lg p-1.5 border text-left', isToday ? 'border-champagne bg-champagne/5' : 'border-espresso/5 bg-ivory-2/30')}>
              <p className={cn('text-xs', isToday ? 'font-bold text-champagne-dark' : 'text-taupe')}>{day}</p>
              {dayReminders.slice(0, 2).map(r => {
                const isOver = r.status === 'pending' && daysUntil(r.due_date) !== null && daysUntil(r.due_date)! < 0;
                return (
                  <div key={r.id} className={cn('mt-1 text-[10px] sm:text-[11px] rounded px-1 py-0.5 truncate',
                    r.status === 'completed' ? 'bg-sage/15 text-sage line-through' : isOver ? 'bg-rose/15 text-rose' : 'bg-champagne/15 text-champagne-dark')}>
                    {r.title}
                  </div>
                );
              })}
              {dayReminders.length > 2 && <p className="text-[10px] text-taupe mt-0.5">+{dayReminders.length - 2} more</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReminderForm({ open, reminder, docs, onClose, onSaved }: {
  open: boolean; reminder: Reminder | null; docs: DocumentRecord[];
  onClose: () => void; onSaved: (r: Reminder) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>('Renewal');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [documentId, setDocumentId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(reminder?.title || '');
      setDescription(reminder?.description || '');
      setReminderType(reminder?.reminder_type || 'Renewal');
      setDueDate(reminder?.due_date?.slice(0, 10) || '');
      setPriority(reminder?.priority || 'medium');
      setDocumentId(reminder?.document_id || '');
    }
  }, [open, reminder]);

  async function handleSubmit() {
    if (!title.trim() || !dueDate) { toast('Title and due date are required.', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), description: description.trim() || undefined,
        reminder_type: reminderType, due_date: dueDate, priority,
        document_id: documentId || null,
      };
      if (reminder) {
        onSaved(await updateReminder(reminder.id, payload));
        toast('Reminder updated.', 'success');
      } else {
        onSaved(await createReminder(payload));
        toast('Reminder created.', 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save reminder.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reminder ? 'Edit reminder' : 'New reminder'}
      size="md"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : reminder ? 'Save changes' : 'Create reminder'}</button></>}
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Renew car insurance" autoFocus />
        </div>
        <div>
          <label className="label">Description <span className="text-taupe/60 normal-case">(optional)</span></label>
          <textarea className="input min-h-[72px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes about this reminder…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={reminderType} onChange={e => setReminderType(e.target.value as ReminderType)}>
              {REMINDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Due date</label>
          <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        {docs.length > 0 && (
          <div>
            <label className="label">Link to document <span className="text-taupe/60 normal-case">(optional)</span></label>
            <select className="input" value={documentId} onChange={e => setDocumentId(e.target.value)}>
              <option value="">None</option>
              {docs.map(d => <option key={d.id} value={d.id}>{d.document_name}</option>)}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
}
