import { useEffect, useState, useCallback } from 'react';
import {
  ListChecks, Sparkles, Plus, Trash2, Check, ChevronDown, ChevronRight,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import {
  listChecklists, deleteChecklist, addChecklistItem, updateChecklistItem,
  deleteChecklistItem, saveSuggestedChecklist,
} from '@/lib/services';
import { generateChecklist } from '@/lib/ai';
import { Checklist, ChecklistItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

const SITUATIONS = [
  'College admission', 'Job application', 'Passport application', 'Visa preparation',
  'International travel', 'Renting a house', 'Loan application', 'Insurance renewal',
];

export function Checklists() {
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showGen, setShowGen] = useState(false);
  const [situation, setSituation] = useState('');
  const [customSituation, setCustomSituation] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Checklist | null>(null);
  const [addItemTo, setAddItemTo] = useState<Checklist | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemRequired, setNewItemRequired] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await listChecklists();
      setChecklists(c);
      if (c.length > 0 && !expanded) setExpanded(c[0].id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load checklists.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, expanded]);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    const s = situation === 'Custom' ? customSituation.trim() : situation;
    if (!s) { toast('Choose or describe a situation.', 'error'); return; }
    setGenerating(true);
    try {
      const res = await generateChecklist(s);
      if (!res.available) { toast('AI checklist generation is not configured.', 'error'); return; }
      if (!res.suggestion || res.suggestion.items.length === 0) {
        toast('AI could not generate a checklist for this situation.', 'error'); return;
      }
      const saved = await saveSuggestedChecklist(res.suggestion, s);
      setChecklists(prev => [saved, ...prev]);
      setExpanded(saved.id);
      setShowGen(false);
      setCustomSituation('');
      toast('Checklist generated.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Generation failed.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleItem(item: ChecklistItem) {
    try {
      await updateChecklistItem(item.id, { is_completed: !item.is_completed });
      setChecklists(prev => prev.map(c => c.id === item.checklist_id ? {
        ...c,
        checklist_items: c.checklist_items?.map(i => i.id === item.id ? { ...i, is_completed: !i.is_completed } : i),
      } : c));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed.', 'error');
    }
  }

  async function handleDeleteItem(item: ChecklistItem) {
    try {
      await deleteChecklistItem(item.id);
      setChecklists(prev => prev.map(c => c.id === item.checklist_id ? {
        ...c, checklist_items: c.checklist_items?.filter(i => i.id !== item.id),
      } : c));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteChecklist(deleteTarget.id);
      setChecklists(prev => prev.filter(c => c.id !== deleteTarget.id));
      toast('Checklist deleted.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  }

  async function handleAddItem() {
    if (!addItemTo || !newItemTitle.trim()) return;
    try {
      const item = await addChecklistItem({ checklist_id: addItemTo.id, title: newItemTitle.trim(), is_required: newItemRequired });
      setChecklists(prev => prev.map(c => c.id === addItemTo.id ? { ...c, checklist_items: [...(c.checklist_items || []), item] } : c));
      setNewItemTitle(''); setNewItemRequired(true); setAddItemTo(null);
      toast('Item added.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Add failed.', 'error');
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-espresso">Life checklists</h2>
          <p className="text-taupe text-sm mt-1">AI-prepared checklists for any situation.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowGen(true)}>
          <Sparkles size={16} /> <span className="hidden sm:inline">Generate</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : checklists.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ListChecks size={26} />}
            title="No checklists yet"
            description="Generate an AI checklist for a life situation like travel, applications or renewals."
            action={<button className="btn-gold" onClick={() => setShowGen(true)}><Sparkles size={15} /> Generate checklist</button>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {checklists.map(c => {
            const items = c.checklist_items || [];
            const done = items.filter(i => i.is_completed).length;
            const pct = items.length ? Math.round((done / items.length) * 100) : 0;
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="w-full p-4 sm:p-5 flex items-center gap-3 text-left hover:bg-ivory-2/30 transition-colors"
                >
                  {isOpen ? <ChevronDown size={18} className="text-taupe shrink-0" /> : <ChevronRight size={18} className="text-taupe shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-espresso truncate">{c.title}</p>
                    <p className="text-xs text-taupe mt-0.5">{done}/{items.length} complete · {c.situation_type}</p>
                  </div>
                  <div className="hidden sm:block w-24">
                    <div className="h-1.5 rounded-full bg-ivory-2 overflow-hidden">
                      <div className="h-full bg-champagne transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                    className="p-2 text-taupe hover:text-rose rounded-lg hover:bg-rose/8 transition-colors shrink-0"
                    aria-label="Delete checklist"
                  >
                    <Trash2 size={14} />
                  </button>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 animate-fade-in">
                    {c.description && <p className="text-xs text-taupe mb-3 leading-relaxed">{c.description}</p>}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 rounded-full bg-ivory-2 overflow-hidden sm:hidden">
                        <div className="h-full bg-champagne" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-taupe">{pct}%</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map(item => (
                        <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-ivory-2/40 group">
                          <button
                            onClick={() => handleToggleItem(item)}
                            className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                              item.is_completed ? 'bg-sage border-sage text-white' : 'border-taupe/40 hover:border-sage')}
                          >
                            {item.is_completed && <Check size={12} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm text-espresso', item.is_completed && 'line-through opacity-60')}>{item.title}</p>
                            {item.description && <p className="text-xs text-taupe mt-0.5">{item.description}</p>}
                            <span className={cn('chip mt-1', item.is_required ? 'bg-rose/10 text-rose' : 'bg-sage/10 text-sage')}>
                              {item.is_required ? 'Required' : 'Optional'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-taupe opacity-0 group-hover:opacity-100 hover:text-rose rounded transition-all shrink-0"
                            aria-label="Delete item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setAddItemTo(c); setNewItemTitle(''); setNewItemRequired(true); }}
                      className="mt-3 text-xs text-champagne-dark hover:underline inline-flex items-center gap-1">
                      <Plus size={12} /> Add item
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showGen}
        onClose={() => setShowGen(false)}
        title="Generate a checklist"
        size="md"
        footer={<><button className="btn-ghost" onClick={() => setShowGen(false)}>Cancel</button>
          <button className="btn-gold" onClick={handleGenerate} disabled={generating || !situation || (situation === 'Custom' && !customSituation.trim())}>
            {generating ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Generate</>}
          </button></>}
      >
        <p className="text-sm text-taupe mb-4">Choose a situation and the AI will suggest required documents, optional items and preparation tasks.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {SITUATIONS.map(s => (
            <button key={s} onClick={() => setSituation(s)}
              className={cn('chip px-3 py-2.5 border text-sm transition-colors text-center justify-center',
                situation === s ? 'bg-champagne/15 border-champagne text-champagne-dark' : 'bg-ivory border-espresso/10 text-taupe hover:border-champagne/50')}>
              {s}
            </button>
          ))}
          <button onClick={() => setSituation('Custom')}
            className={cn('chip px-3 py-2.5 border text-sm transition-colors text-center justify-center',
              situation === 'Custom' ? 'bg-champagne/15 border-champagne text-champagne-dark' : 'bg-ivory border-espresso/10 text-taupe hover:border-champagne/50')}>
            Custom
          </button>
        </div>
        {situation === 'Custom' && (
          <div>
            <label className="label">Describe your situation</label>
            <input className="input" value={customSituation} onChange={e => setCustomSituation(e.target.value)} placeholder="e.g. Preparing for a wedding abroad" autoFocus />
          </div>
        )}
        <div className="mt-4 rounded-xl bg-ivory-2/60 p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-champagne-dark mt-0.5 shrink-0" />
          <p className="text-xs text-taupe leading-relaxed">AI-generated checklists are general guidance, not guaranteed official requirements. Always verify with the relevant authority.</p>
        </div>
      </Modal>

      <Modal
        open={!!addItemTo}
        onClose={() => setAddItemTo(null)}
        title="Add checklist item"
        size="sm"
        footer={<><button className="btn-ghost" onClick={() => setAddItemTo(null)}>Cancel</button><button className="btn-primary" onClick={handleAddItem} disabled={!newItemTitle.trim()}>Add item</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Item title</label>
            <input className="input" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="e.g. Passport photo" autoFocus />
          </div>
          <label className="flex items-center gap-2 text-sm text-espresso cursor-pointer">
            <input type="checkbox" checked={newItemRequired} onChange={e => setNewItemRequired(e.target.checked)} className="accent-champagne" />
            Required
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete checklist?"
        message={`"${deleteTarget?.title}" and all its items will be deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
