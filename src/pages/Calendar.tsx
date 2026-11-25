import { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, FileText, Bell, ListTodo, Clock,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import { listTasks, listReminders, listDocuments } from '@/lib/services';
import { Task, Reminder, DocumentRecord, AppRoute, TaskStatus, TASK_STATUS_META } from '@/lib/types';
import { cn, formatDate, daysUntil } from '@/lib/utils';
import { PRIORITY_META } from '@/lib/categories';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface CalendarItem {
  date: string;
  type: 'task' | 'reminder' | 'document';
  label: string;
  meta?: string;
  status?: TaskStatus;
  priority?: string;
  id: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function Calendar({ onNavigate }: { onNavigate?: (r: AppRoute) => void }) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r, d] = await Promise.all([listTasks(), listReminders(), listDocuments()]);
      setTasks(t);
      setReminders(r);
      setDocs(d);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load calendar data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Build calendar items grouped by date
  const itemsByDate = new Map<string, CalendarItem[]>();

  for (const t of tasks) {
    if (!t.deadline) continue;
    const dateStr = t.deadline;
    const arr = itemsByDate.get(dateStr) || [];
    arr.push({
      date: dateStr, type: 'task', id: t.id, label: t.title,
      status: t.status, priority: t.priority,
    });
    itemsByDate.set(dateStr, arr);
  }
  for (const r of reminders) {
    const dateStr = r.due_date;
    const arr = itemsByDate.get(dateStr) || [];
    arr.push({
      date: dateStr, type: 'reminder', id: r.id, label: r.title,
      meta: r.reminder_type, status: r.status === 'completed' ? 'completed' as TaskStatus : undefined,
    });
    itemsByDate.set(dateStr, arr);
  }
  for (const d of docs) {
    if (!d.expiry_date) continue;
    const dateStr = d.expiry_date;
    const arr = itemsByDate.get(dateStr) || [];
    arr.push({
      date: dateStr, type: 'document', id: d.id, label: `${d.document_name} expires`,
      meta: d.category,
    });
    itemsByDate.set(dateStr, arr);
  }

  // Build the calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateString(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedItems = selectedDate ? (itemsByDate.get(selectedDate) || []) : [];

  // Upcoming items (next 14 days)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming: CalendarItem[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = toDateString(d);
    const items = itemsByDate.get(dateStr) || [];
    for (const item of items) upcoming.push(item);
  }

  function prevMonth() { setCurrentMonth(new Date(year, month - 1, 1)); }
  function nextMonth() { setCurrentMonth(new Date(year, month + 1, 1)); }
  function goToday() {
    const d = new Date();
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(toDateString(d));
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">
      <div className="mb-6 animate-fade-in">
        <h2 className="font-serif text-2xl sm:text-3xl text-espresso">Calendar</h2>
        <p className="text-taupe text-sm mt-1">Tasks, deadlines, renewals, and reminders in one view.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-espresso">{MONTHS[month]} {year}</h3>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-2 rounded-lg text-taupe hover:bg-ivory-2 hover:text-espresso transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs text-taupe hover:bg-ivory-2 hover:text-espresso transition-colors">Today</button>
              <button onClick={nextMonth} className="p-2 rounded-lg text-taupe hover:bg-ivory-2 hover:text-espresso transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-taupe py-1.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="aspect-square" />;
              const dateStr = toDateString(date);
              const items = itemsByDate.get(dateStr) || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasOverdue = items.some(it => {
                const d = daysUntil(dateStr);
                return d !== null && d < 0 && it.type !== 'reminder';
              });

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    'aspect-square rounded-lg p-1 text-left transition-colors border',
                    isSelected ? 'border-champagne bg-champagne/8' : 'border-transparent hover:bg-ivory-2/60',
                    isToday && !isSelected && 'border-champagne/40',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium',
                    isToday ? 'text-champagne-dark' : items.length > 0 ? 'text-espresso' : 'text-taupe',
                  )}>
                    {date.getDate()}
                  </div>
                  {items.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap">
                      {items.slice(0, 3).map((it, j) => (
                        <span key={j} className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          it.type === 'task' && it.status === 'completed' ? 'bg-espresso/30'
                            : it.type === 'task' ? 'bg-sage'
                            : it.type === 'reminder' ? 'bg-champagne'
                            : hasOverdue ? 'bg-rose' : 'bg-taupe',
                        )} />
                      ))}
                      {items.length > 3 && <span className="text-[8px] text-taupe">+{items.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3 border-t border-espresso/5 text-[10px] text-taupe flex-wrap">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sage" /> Task deadline</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-champagne" /> Reminder</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose" /> Document expiry</span>
          </div>
        </div>

        {/* Side panel: selected day + upcoming */}
        <div className="space-y-5">
          {/* Selected day details */}
          <div className="card p-5">
            <h3 className="font-serif text-lg text-espresso mb-3">
              {selectedDate ? formatDate(selectedDate) : 'Select a day'}
            </h3>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-taupe py-3">Nothing scheduled for this day.</p>
            ) : (
              <div className="space-y-2.5">
                {selectedItems.map((item, i) => (
                  <CalendarItemRow key={i} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-champagne-dark" />
              <h3 className="font-serif text-lg text-espresso">Next 14 days</h3>
            </div>
            {upcoming.length === 0 ? (
              <div className="py-4">
                <EmptyState icon={<Clock size={20} />} title="Nothing upcoming" description="No deadlines or reminders in the next two weeks." className="py-6" />
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 8).map((item, i) => (
                  <CalendarItemRow key={i} item={item} compact onNavigate={onNavigate} />
                ))}
                {upcoming.length > 8 && <p className="text-xs text-taupe pt-1">+ {upcoming.length - 8} more</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarItemRow({ item, compact, onNavigate }: { item: CalendarItem; compact?: boolean; onNavigate?: (r: AppRoute) => void }) {
  const Icon = item.type === 'task' ? ListTodo : item.type === 'reminder' ? Bell : FileText;
  const days = daysUntil(item.date);
  const isOverdue = days !== null && days < 0 && item.status !== 'completed';

  return (
    <button
      onClick={() => onNavigate?.(item.type === 'task' ? 'actions' : item.type === 'reminder' ? 'reminders' : 'documents')}
      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-ivory-2/60 transition-colors text-left"
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        item.type === 'task' ? 'bg-sage/12' : item.type === 'reminder' ? 'bg-champagne/12' : 'bg-rose/12',
      )}>
        <Icon size={14} className={item.type === 'task' ? 'text-sage' : item.type === 'reminder' ? 'text-champagne-dark' : 'text-rose'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium text-espresso truncate', item.status === 'completed' && 'line-through text-taupe')}>
          {item.label}
        </p>
        {!compact && (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {item.status && item.type === 'task' && (
              <span className={cn('text-[9px]', TASK_STATUS_META[item.status].color)}>{TASK_STATUS_META[item.status].label}</span>
            )}
            {item.priority && PRIORITY_META[item.priority as keyof typeof PRIORITY_META] && (
              <span className={cn('text-[9px]', PRIORITY_META[item.priority as keyof typeof PRIORITY_META].text)}>{PRIORITY_META[item.priority as keyof typeof PRIORITY_META].label}</span>
            )}
          </div>
        )}
        {compact && <p className="text-[10px] text-taupe">{formatDate(item.date)}</p>}
      </div>
      {isOverdue && <span className="text-[9px] text-rose shrink-0">Overdue</span>}
    </button>
  );
}
