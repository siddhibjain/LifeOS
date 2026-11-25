import { useEffect, useState, useCallback } from 'react';
import { Lock, Plus, Trash2, Pencil, Eye, EyeOff, Shield } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { listVaultEntries, createVaultEntry, updateVaultEntry, deleteVaultEntry } from '@/lib/services';
import { VaultEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

const VAULT_CATEGORIES = ['Personal', 'Education', 'Finance', 'Contact', 'Other'];

export function Vault() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VaultEntry | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await listVaultEntries());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load vault.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function toggleReveal(id: string) {
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteVaultEntry(deleteTarget.id);
      setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
      toast('Entry deleted.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  }

  function handleSaved(entry: VaultEntry) {
    setEntries(prev => {
      const exists = prev.find(e => e.id === entry.id);
      return exists ? prev.map(e => e.id === entry.id ? entry : e) : [...prev, entry];
    });
  }

  // group by category
  const grouped = entries.reduce<Record<string, VaultEntry[]>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-espresso">Personal vault</h2>
          <p className="text-taupe text-sm mt-1">Reusable information, kept private to you.</p>
        </div>
        <button className="btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> <span className="hidden sm:inline">Add entry</span>
        </button>
      </div>

      <div className="card p-4 mb-5 flex items-start gap-3 bg-sage/5 border-sage/20">
        <Shield size={18} className="text-sage mt-0.5 shrink-0" />
        <p className="text-xs text-espresso/70 leading-relaxed">
          Your vault entries are protected by row-level security and visible only to you. Values are masked by default — click the eye icon to reveal them temporarily.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : entries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Lock size={26} />}
            title="Your vault is empty"
            description="Store reusable information like your address, date of birth, or education details so you never have to retype them."
            action={<button className="btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> Add your first entry</button>}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-medium uppercase tracking-wide text-taupe mb-2.5">{cat}</h3>
              <div className="space-y-2">
                {items.map(e => (
                  <div key={e.id} className="card p-4 flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-ivory-2 flex items-center justify-center shrink-0">
                      <Lock size={16} className="text-taupe" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-espresso">{e.field_name}</p>
                      <p className="text-xs text-taupe mt-0.5 font-mono">
                        {revealed.has(e.id) ? (e.protected_field_value || '—') : '•'.repeat(Math.min((e.protected_field_value || '').length, 16) || 8)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleReveal(e.id)} className="p-2 text-taupe hover:text-espresso rounded-lg hover:bg-ivory-2 transition-colors" aria-label="Reveal">
                        {revealed.has(e.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => { setEditing(e); setShowForm(true); }} className="p-2 text-taupe hover:text-espresso rounded-lg hover:bg-ivory-2 transition-colors" aria-label="Edit"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteTarget(e)} className="p-2 text-taupe hover:text-rose rounded-lg hover:bg-rose/8 transition-colors" aria-label="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <VaultForm
        open={showForm}
        entry={editing}
        onClose={() => setShowForm(false)}
        onSaved={(e) => { handleSaved(e); setShowForm(false); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete vault entry?"
        message={`"${deleteTarget?.field_name}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function VaultForm({ open, entry, onClose, onSaved }: {
  open: boolean; entry: VaultEntry | null; onClose: () => void; onSaved: (e: VaultEntry) => void;
}) {
  const { toast } = useToast();
  const [fieldName, setFieldName] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('Personal');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFieldName(entry?.field_name || '');
      setValue(entry?.protected_field_value || '');
      setCategory(entry?.category || 'Personal');
    }
  }, [open, entry]);

  async function handleSubmit() {
    if (!fieldName.trim()) { toast('Field name is required.', 'error'); return; }
    setSaving(true);
    try {
      const payload = { field_name: fieldName.trim(), protected_field_value: value, category };
      if (entry) {
        await updateVaultEntry(entry.id, payload);
        onSaved({ ...entry, ...payload });
        toast('Entry updated.', 'success');
      } else {
        const created = await createVaultEntry(payload);
        onSaved(created);
        toast('Entry added.', 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save entry.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit vault entry' : 'Add vault entry'}
      size="md"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}
    >
      <div className="space-y-4">
        <div>
          <label className="label">Field name</label>
          <input className="input" value={fieldName} onChange={e => setFieldName(e.target.value)} placeholder="e.g. Date of birth" autoFocus />
        </div>
        <div>
          <label className="label">Value</label>
          <input className="input" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. January 15, 1990" />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {VAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
