import { useEffect, useState, useCallback } from 'react';
import {
  Plus, CheckCircle2, Circle, Clock, Mail, Trash2, Pencil, FileText,
  AlertTriangle, ChevronLeft, ListTodo, ArrowRight,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import {
  listTasks, createTask, updateTask, deleteTask, listDocuments,
} from '@/lib/services';
import {
  Task, TaskStatus, TASK_STATUSES, TASK_STATUS_META, Priority, PRIORITIES,
  DocumentRecord, AppRoute,
} from '@/lib/types';
import { PRIORITY_META } from '@/lib/categories';
import { cn, formatDate, daysUntil } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  not_started: Circle,
  in_progress: Clock,
  waiting: Mail,
  completed: CheckCircle2,
};

export function ActionCenter({ onNavigate }: { onNavigate?: (r: AppRoute) => void }) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d] = await Promise.all([listTasks(), listDocuments()]);
      setTasks(t);
      setDocs(d);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load tasks.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const docName = (id: string | null) => {
    if (!id) return null;
    const d = docs.find(doc => doc.id === id);
    return d?.document_name || null;
  };

  async function handleStatusChange(task: Task, status: TaskStatus) {
    try {
      const updated = await updateTask(task.id, { status });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update task.', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget.id);
      setTasks(prev => prev.filter(t => t.id !== deleteTarget.id));
      toast('Task deleted.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  }

  async function handleSave(task: Task, patch: Partial<Task>) {
    try {
      const updated = await updateTask(task.id, patch);
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      toast('Task updated.', 'success');
      setEditTarget(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed.', 'error');
    }
  }

  const counts = TASK_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s).length;
    return acc;
  }, {});

  const filtered = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Skeleton className="h-32 w-full mb-6" />
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-espresso">Action Center</h2>
          <p className="text-taupe text-sm mt-1">Manage tasks created from documents and manually.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> <span className="hidden sm:inline">New task</span>
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <FilterChip label="All" count={tasks.length} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        {TASK_STATUSES.map(s => (
          <FilterChip
            key={s}
            label={TASK_STATUS_META[s].label}
            count={counts[s]}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ListTodo size={28} />}
            title={tasks.length === 0 ? 'No tasks yet' : 'No tasks in this status'}
            description={tasks.length === 0
              ? 'Create tasks manually or upload a document — AI will suggest actions you can approve.'
              : 'Tasks with this status will appear here.'}
            action={tasks.length === 0 ? (
              <div className="flex gap-2 flex-wrap justify-center">
                <button className="btn-gold" onClick={() => setShowCreate(true)}><Plus size={16} /> Create task</button>
                {onNavigate && <button className="btn-outline" onClick={() => onNavigate('documents')}><FileText size={16} /> Upload document</button>}
              </div>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              docName={docName(task.document_id)}
              onStatusChange={handleStatusChange}
              onEdit={() => setEditTarget(task)}
              onDelete={() => setDeleteTarget(task)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <TaskFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        docs={docs}
        onSubmit={async (data) => {
          try {
            const created = await createTask(data);
            setTasks(prev => [created, ...prev]);
            toast('Task created.', 'success');
            setShowCreate(false);
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not create task.', 'error');
          }
        }}
      />

      {/* Edit modal */}
      {editTarget && (
        <TaskFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          task={editTarget}
          docs={docs}
          onSubmit={(data) => handleSave(editTarget, data)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete task?"
        message={`This will permanently delete "${deleteTarget?.title}". This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'bg-champagne/15 text-champagne-dark' : 'bg-ivory-2/60 text-taupe hover:bg-ivory-2',
      )}
    >
      {label} <span className={cn('text-xs', active ? 'text-champagne-dark' : 'text-taupe/60')}>{count}</span>
    </button>
  );
}

function TaskRow({ task, docName, onStatusChange, onEdit, onDelete }: {
  task: Task;
  docName: string | null;
  onStatusChange: (t: Task, s: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = STATUS_ICONS[task.status];
  const meta = TASK_STATUS_META[task.status];
  const days = daysUntil(task.deadline);
  const prio = PRIORITY_META[task.priority];

  return (
    <div className="card p-4 sm:p-5 hover:shadow-soft transition-shadow">
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            const idx = TASK_STATUSES.indexOf(task.status);
            const next = TASK_STATUSES[(idx + 1) % TASK_STATUSES.length];
            onStatusChange(task, next);
          }}
          className={cn('mt-0.5 shrink-0', meta.color)}
          title={`Status: ${meta.label} — click to advance`}
        >
          <Icon size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-sm font-medium text-espresso', task.status === 'completed' && 'line-through text-taupe')}>
              {task.title}
            </p>
            {task.ai_suggested && (
              <span className="chip bg-champagne/10 text-champagne-dark text-[10px]">AI</span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-taupe mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('chip text-[10px]', meta.bg, meta.color)}>{meta.label}</span>
            <span className={cn('chip text-[10px]', prio.bg, prio.text)}>{prio.label}</span>
            {task.deadline && (
              <span className={cn(
                'chip text-[10px]',
                days !== null && days < 0 ? 'bg-rose/15 text-rose'
                  : days !== null && days <= 7 ? 'bg-champagne/15 text-champagne-dark'
                  : 'bg-ivory-2 text-taupe',
              )}>
                {days !== null && days < 0 ? `Overdue ${formatDate(task.deadline)}`
                  : days !== null && days <= 7 ? `Due in ${days}d`
                  : `Due ${formatDate(task.deadline)}`}
              </span>
            )}
            {docName && (
              <span className="chip bg-ivory-2 text-taupe text-[10px] inline-flex items-center gap-1">
                <FileText size={10} /> {docName.length > 20 ? docName.slice(0, 20) + '…' : docName}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-2 rounded-lg text-taupe hover:bg-ivory-2 hover:text-espresso transition-colors" title="Edit">
            <Pencil size={15} />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg text-taupe hover:bg-rose/10 hover:text-rose transition-colors" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskFormModal({ open, onClose, onSubmit, task, docs }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    deadline?: string | null;
    document_id?: string | null;
    source_evidence?: string | null;
  }) => void;
  task?: Task;
  docs: DocumentRecord[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [evidence, setEvidence] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(task?.title || '');
      setDescription(task?.description || '');
      setStatus(task?.status || 'not_started');
      setPriority(task?.priority || 'medium');
      setDeadline(task?.deadline || '');
      setDocumentId(task?.document_id || '');
      setEvidence(task?.source_evidence || '');
    }
  }, [open, task]);

  function handleSubmit() {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      deadline: deadline || null,
      document_id: documentId || null,
      source_evidence: evidence.trim() || null,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      size="md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!title.trim()}>
            {task ? 'Save changes' : 'Create task'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[80px] resize-y" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add details…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{TASK_STATUS_META[s].label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Deadline</label>
            <input className="input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div>
            <label className="label">Source document</label>
            <select className="input" value={documentId} onChange={e => setDocumentId(e.target.value)}>
              <option value="">None</option>
              {docs.map(d => <option key={d.id} value={d.id}>{d.document_name}</option>)}
            </select>
          </div>
        </div>
        {documentId && (
          <div>
            <label className="label">Source evidence</label>
            <textarea className="input min-h-[60px] resize-y" value={evidence} onChange={e => setEvidence(e.target.value)}
              placeholder="Excerpt from the document that prompted this action…" />
          </div>
        )}
      </div>
    </Modal>
  );
}
