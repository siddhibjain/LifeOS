import { useEffect, useState, useCallback } from 'react';
import {
  Mail, Plus, Trash2, Pencil, FileText, Clock, AlertTriangle,
  CheckCircle2, Send, Copy,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import {
  listFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
  listDocuments, listTasks,
} from '@/lib/services';
import {
  FollowUp, FollowUpStatus, FOLLOW_UP_STATUS_META, DocumentRecord, Task,
} from '@/lib/types';
import { cn, formatDate, daysUntil } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

export function FollowUpAssistant() {
  const { toast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | 'all'>('all');
  const [editTarget, setEditTarget] = useState<FollowUp | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FollowUp | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draftTarget, setDraftTarget] = useState<FollowUp | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, d, t] = await Promise.all([listFollowUps(), listDocuments(), listTasks()]);
      setFollowUps(f);
      setDocs(d);
      setTasks(t);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load follow-ups.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Auto-detect overdue
  useEffect(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const f of followUps) {
      if (f.status === 'pending' && f.expected_response_date) {
        const exp = new Date(f.expected_response_date); exp.setHours(0, 0, 0, 0);
        if (exp < today) {
          updateFollowUp(f.id, { status: 'overdue' }).then(() => load()).catch(() => {});
        }
      }
    }
  }, [followUps, load]);

  const docName = (id: string | null) => {
    if (!id) return null;
    return docs.find(d => d.id === id)?.document_name || null;
  };

  async function handleStatusChange(fu: FollowUp, status: FollowUpStatus) {
    try {
      const updated = await updateFollowUp(fu.id, { status });
      setFollowUps(prev => prev.map(f => f.id === fu.id ? updated : f));
      toast(`Marked as ${FOLLOW_UP_STATUS_META[status].label.toLowerCase()}.`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update status.', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFollowUp(deleteTarget.id);
      setFollowUps(prev => prev.filter(f => f.id !== deleteTarget.id));
      toast('Follow-up deleted.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  }

  async function handleSave(fu: FollowUp, patch: Partial<FollowUp>) {
    try {
      const updated = await updateFollowUp(fu.id, patch);
      setFollowUps(prev => prev.map(f => f.id === fu.id ? updated : f));
      toast('Follow-up updated.', 'success');
      setEditTarget(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed.', 'error');
    }
  }

  function generateDraft(fu: FollowUp): string {
    const docRef = docName(fu.document_id);
    const days = fu.expected_response_date ? daysUntil(fu.expected_response_date) : null;
    const dateStr = fu.submission_date ? formatDate(fu.submission_date) : 'recently';
    return `Dear ${fu.contact_info || 'Sir/Madam'},

I hope this message finds you well. I am writing to follow up on my submission${fu.title ? ` regarding "${fu.title}"` : ''} submitted on ${dateStr}${docRef ? ` (document: ${docRef})` : ''}.

I would appreciate an update on the status of my request${days !== null && days < 0 ? ', which is now past the expected response date' : ''}.

Thank you for your time and attention to this matter. I look forward to hearing from you soon.

Best regards,`;
  }

  const counts: Record<string, number> = {
    pending: followUps.filter(f => f.status === 'pending').length,
    responded: followUps.filter(f => f.status === 'responded').length,
    overdue: followUps.filter(f => f.status === 'overdue').length,
  };

  const filtered = statusFilter === 'all' ? followUps : followUps.filter(f => f.status === statusFilter);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <Skeleton className="h-32 w-full mb-6" />
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-espresso">FollowUp Assistant</h2>
          <p className="text-taupe text-sm mt-1">Track pending responses and unfinished processes.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> <span className="hidden sm:inline">New follow-up</span>
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn('px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            statusFilter === 'all' ? 'bg-champagne/15 text-champagne-dark' : 'bg-ivory-2/60 text-taupe hover:bg-ivory-2')}
        >
          All <span className="text-xs text-taupe/60">{followUps.length}</span>
        </button>
        {(['pending', 'responded', 'overdue'] as FollowUpStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn('px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              statusFilter === s ? 'bg-champagne/15 text-champagne-dark' : 'bg-ivory-2/60 text-taupe hover:bg-ivory-2')}
          >
            {FOLLOW_UP_STATUS_META[s].label} <span className="text-xs text-taupe/60">{counts[s]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Mail size={28} />}
            title={followUps.length === 0 ? 'No follow-ups yet' : 'Nothing in this status'}
            description={followUps.length === 0
              ? 'Track pending responses from applications, submissions, and requests. Generate polite follow-up messages with one click.'
              : 'Follow-ups with this status will appear here.'}
            action={followUps.length === 0 ? <button className="btn-gold" onClick={() => setShowCreate(true)}><Plus size={16} /> Create follow-up</button> : undefined}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(fu => (
            <FollowUpRow
              key={fu.id}
              fu={fu}
              docName={docName(fu.document_id)}
              onStatusChange={handleStatusChange}
              onEdit={() => setEditTarget(fu)}
              onDelete={() => setDeleteTarget(fu)}
              onDraft={() => setDraftTarget(fu)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <FollowUpFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        docs={docs}
        tasks={tasks}
        onSubmit={async (data) => {
          try {
            const created = await createFollowUp(data);
            setFollowUps(prev => [created, ...prev]);
            toast('Follow-up created.', 'success');
            setShowCreate(false);
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not create follow-up.', 'error');
          }
        }}
      />

      {/* Edit modal */}
      {editTarget && (
        <FollowUpFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          fu={editTarget}
          docs={docs}
          tasks={tasks}
          onSubmit={(data) => handleSave(editTarget, data)}
        />
      )}

      {/* Draft modal */}
      {draftTarget && (
        <DraftModal
          fu={draftTarget}
          draft={generateDraft(draftTarget)}
          onClose={() => setDraftTarget(null)}
          onSave={async (msg) => {
            try {
              const updated = await updateFollowUp(draftTarget.id, { follow_up_message: msg });
              setFollowUps(prev => prev.map(f => f.id === draftTarget.id ? updated : f));
              toast('Follow-up message saved.', 'success');
              setDraftTarget(null);
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Could not save message.', 'error');
            }
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete follow-up?"
        message={`This will permanently delete "${deleteTarget?.title}". This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function FollowUpRow({ fu, docName, onStatusChange, onEdit, onDelete, onDraft }: {
  fu: FollowUp;
  docName: string | null;
  onStatusChange: (f: FollowUp, s: FollowUpStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDraft: () => void;
}) {
  const meta = FOLLOW_UP_STATUS_META[fu.status];
  const days = daysUntil(fu.expected_response_date);

  return (
    <div className="card p-4 sm:p-5 hover:shadow-soft transition-shadow">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
          {fu.status === 'overdue' ? <AlertTriangle size={18} className="text-rose" />
            : fu.status === 'responded' ? <CheckCircle2 size={18} className="text-sage" />
            : <Clock size={18} className="text-champagne-dark" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-espresso">{fu.title}</p>
          {fu.description && <p className="text-xs text-taupe mt-1 line-clamp-2">{fu.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('chip text-[10px]', meta.bg, meta.color)}>{meta.label}</span>
            {fu.submission_date && (
              <span className="chip bg-ivory-2 text-taupe text-[10px]">Submitted {formatDate(fu.submission_date)}</span>
            )}
            {fu.expected_response_date && (
              <span className={cn('chip text-[10px]',
                days !== null && days < 0 ? 'bg-rose/15 text-rose'
                  : days !== null && days <= 3 ? 'bg-champagne/15 text-champagne-dark'
                  : 'bg-ivory-2 text-taupe',
              )}>
                {days !== null && days < 0 ? `Overdue by ${Math.abs(days)}d`
                  : days !== null && days <= 3 ? `Response in ${days}d`
                  : `Expected ${formatDate(fu.expected_response_date)}`}
              </span>
            )}
            {docName && (
              <span className="chip bg-ivory-2 text-taupe text-[10px] inline-flex items-center gap-1">
                <FileText size={10} /> {docName.length > 18 ? docName.slice(0, 18) + '…' : docName}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onDraft} className="p-2 rounded-lg text-taupe hover:bg-champagne/10 hover:text-champagne-dark transition-colors" title="Draft message">
            <Send size={15} />
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg text-taupe hover:bg-ivory-2 hover:text-espresso transition-colors" title="Edit">
            <Pencil size={15} />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg text-taupe hover:bg-rose/10 hover:text-rose transition-colors" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {fu.status !== 'responded' && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-espresso/5">
          {fu.status !== 'pending' && (
            <button onClick={() => onStatusChange(fu, 'pending')} className="text-xs text-taupe hover:text-espresso transition-colors">Mark pending</button>
          )}
          <button onClick={() => onStatusChange(fu, 'responded')} className="text-xs text-sage hover:underline">Mark responded</button>
          {fu.status !== 'overdue' && (
            <button onClick={() => onStatusChange(fu, 'overdue')} className="text-xs text-rose hover:underline">Mark overdue</button>
          )}
        </div>
      )}
    </div>
  );
}

function FollowUpFormModal({ open, onClose, onSubmit, fu, docs, tasks }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    document_id?: string | null;
    task_id?: string | null;
    submission_date?: string | null;
    expected_response_date?: string | null;
    contact_info?: string | null;
    follow_up_message?: string | null;
  }) => void;
  fu?: FollowUp;
  docs: DocumentRecord[];
  tasks: Task[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(fu?.title || '');
      setDescription(fu?.description || '');
      setDocumentId(fu?.document_id || '');
      setTaskId(fu?.task_id || '');
      setSubmissionDate(fu?.submission_date || '');
      setExpectedDate(fu?.expected_response_date || '');
      setContactInfo(fu?.contact_info || '');
      setMessage(fu?.follow_up_message || '');
    }
  }, [open, fu]);

  function handleSubmit() {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      document_id: documentId || null,
      task_id: taskId || null,
      submission_date: submissionDate || null,
      expected_response_date: expectedDate || null,
      contact_info: contactInfo.trim() || null,
      follow_up_message: message.trim() || null,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fu ? 'Edit follow-up' : 'New follow-up'}
      size="md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!title.trim()}>
            {fu ? 'Save changes' : 'Create'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you following up on?" autoFocus />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[70px] resize-y" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add context…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Submission date</label>
            <input className="input" type="date" value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Expected response</label>
            <input className="input" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Contact info</label>
          <input className="input" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="Who/where was it sent?" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Related document</label>
            <select className="input" value={documentId} onChange={e => setDocumentId(e.target.value)}>
              <option value="">None</option>
              {docs.map(d => <option key={d.id} value={d.id}>{d.document_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Related task</label>
            <select className="input" value={taskId} onChange={e => setTaskId(e.target.value)}>
              <option value="">None</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        </div>
        {message && (
          <div>
            <label className="label">Follow-up message</label>
            <textarea className="input min-h-[80px] resize-y" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function DraftModal({ fu, draft, onClose, onSave }: {
  fu: FollowUp;
  draft: string;
  onClose: () => void;
  onSave: (msg: string) => void;
}) {
  const [text, setText] = useState(draft);

  useEffect(() => { setText(draft); }, [draft]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Follow-up message draft"
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={() => { navigator.clipboard?.writeText(text); }}>Copy to clipboard</button>
          <button className="btn-primary" onClick={() => onSave(text)}>Save message</button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-taupe">
          This is a suggested draft based on your follow-up details. Edit it as needed, then copy it to send through your preferred channel.
          Messages are never sent automatically — you stay in control.
        </p>
        <textarea className="input min-h-[280px] resize-y text-sm leading-relaxed" value={text} onChange={e => setText(e.target.value)} />
      </div>
    </Modal>
  );
}
