import { useEffect, useState, useCallback, useRef, DragEvent } from 'react';
import {
  Upload, FileText, Search, ArrowUpDown, Download, Trash2, Pencil,
  Image as ImageIcon, Check, AlertTriangle, Loader2, ChevronLeft, Sparkles,
  ListTodo, Plus, X, Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import {
  listDocuments, createDocumentRecord, uploadDocumentFile, updateDocument,
  deleteDocument, getSignedUrl, saveExtractedData, confirmExtractedData,
  createTasksFromSuggestions,
} from '@/lib/services';
import { extractDocument } from '@/lib/ai';
import { DocumentRecord, Category, AppRoute, CATEGORIES, SuggestedAction, Priority } from '@/lib/types';
import {
  cn, validateFile, formatBytes, formatDate, daysUntil, relativeTime, isImage, fileExtension,
} from '@/lib/utils';
import { CATEGORY_META } from '@/lib/categories';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

type SortBy = 'date' | 'name';

export function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [renameTarget, setRenameTarget] = useState<DocumentRecord | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<Record<string, SuggestedAction[]>>({});
  const [showActionReview, setShowActionReview] = useState<DocumentRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await listDocuments());
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load documents.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selected) {
      const updated = docs.find(d => d.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [docs, selected]);

  async function handleFiles(files: FileList | File[]) {
    if (!user) return;
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    for (const file of arr) {
      const err = validateFile(file);
      if (err) { toast(err, 'error'); continue; }
      try {
        const { path } = await uploadDocumentFile(user.id, file);
        const doc = await createDocumentRecord({
          document_name: file.name, category: 'Other', file_path: path,
          file_type: file.type, file_size: file.size,
        });
        setDocs(prev => [doc, ...prev]);
        toast(`Uploaded ${file.name}.`, 'success');
        runExtraction(doc, file);
      } catch (e) {
        toast(e instanceof Error ? e.message : `Could not upload ${file.name}.`, 'error');
      }
    }
    setUploading(false);
  }

  async function runExtraction(doc: DocumentRecord, file: File) {
    try {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, extraction_status: 'processing' } : d));
      const res = await extractDocument(doc.id, doc.file_path, file.type, file.name);
      if (!res.available) {
        setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, extraction_status: 'failed' } : d));
        const msg = (res as { error?: string }).error;
        toast(msg || 'AI extraction is not configured. You can edit details manually.', 'error');
        return;
      }
      if (res.extracted) {
        await saveExtractedData({
          document_id: doc.id, extracted_json: res.extracted, extracted_text: res.extracted_text,
          extraction_model: res.model, extraction_confidence: res.confidence,
        });
        const ej = res.extracted;
        const patch: Partial<DocumentRecord> = { extraction_status: 'extracted', review_status: 'pending' };
        if (ej.category) patch.category = ej.category as Category;
        if (ej.expiry_date) patch.expiry_date = ej.expiry_date;
        if (ej.issue_date) patch.issue_date = ej.issue_date;
        if (ej.issuing_authority) patch.issuing_authority = ej.issuing_authority;
        if (ej.document_number) patch.document_number = ej.document_number;
        const updated = await updateDocument(doc.id, patch);
        setDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
        // Store suggested actions for review
        if (res.suggested_actions && res.suggested_actions.length > 0) {
          setSuggestedActions(prev => ({ ...prev, [doc.id]: res.suggested_actions! }));
          toast(`AI extracted details and suggested ${res.suggested_actions!.length} action${res.suggested_actions!.length === 1 ? '' : 's'}.`, 'success');
        } else {
          toast(`AI extracted details from ${file.name}.`, 'success');
        }
      } else {
        setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, extraction_status: 'skipped' } : d));
      }
    } catch (e) {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, extraction_status: 'failed' } : d));
      const msg = e instanceof Error ? e.message : 'Extraction failed.';
      toast(msg.includes('Failed to fetch') ? 'Could not reach the extraction service. Please check your connection and try again.' : msg, 'error');
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }

  async function openPreview(doc: DocumentRecord) {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    try {
      const url = await getSignedUrl(doc.file_path);
      if (!url) {
        setPreviewError('Could not generate a preview URL for this file. The file may have been removed from storage.');
        setPreviewLoading(false);
        return;
      }
      setPreviewUrl(url);
      setPreviewLoading(false);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Failed to load preview.');
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewUrl(null);
    setPreviewDoc(null);
    setPreviewLoading(false);
    setPreviewError(null);
  }

  async function handleRename() {
    if (!renameTarget) return;
    try {
      const updated = await updateDocument(renameTarget.id, { document_name: renameValue });
      setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
      toast('Document renamed.', 'success');
      setRenameTarget(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Rename failed.', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget);
      setDocs(prev => prev.filter(d => d.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      toast('Document deleted.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  }

  async function handleConfirmExtraction(doc: DocumentRecord) {
    if (!doc.extracted_data?.extracted_json) return;
    try {
      await confirmExtractedData(doc.id, doc.extracted_data.extracted_json);
      await updateDocument(doc.id, { review_status: 'confirmed' });
      await load();
      toast('Details confirmed.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not confirm.', 'error');
    }
  }

  async function handleEditField(doc: DocumentRecord, field: keyof DocumentRecord, value: string) {
    try {
      const updated = await updateDocument(doc.id, { [field]: value || null } as Partial<DocumentRecord>);
      setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed.', 'error');
    }
  }

  const filtered = docs
    .filter(d => categoryFilter === 'all' || d.category === categoryFilter)
    .filter(d => d.document_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'name'
      ? a.document_name.localeCompare(b.document_name)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Skeleton className="h-32 w-full mb-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <DocumentDetail
        doc={selected}
        onBack={() => setSelected(null)}
        onRename={() => { setRenameTarget(selected); setRenameValue(selected.document_name); }}
        onDelete={() => setDeleteTarget(selected)}
        onPreview={() => openPreview(selected)}
        onConfirm={() => handleConfirmExtraction(selected)}
        onEditField={handleEditField}
        suggestedActions={suggestedActions[selected.id] || []}
        onReviewActions={() => setShowActionReview(selected)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'card p-6 sm:p-8 mb-6 border-2 border-dashed transition-colors text-center',
          dragActive ? 'border-champagne bg-champagne/5' : 'border-espresso/10',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="w-14 h-14 rounded-2xl bg-champagne/12 flex items-center justify-center text-champagne-dark mx-auto mb-4">
          {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
        </div>
        <p className="font-serif text-lg text-espresso mb-1">{uploading ? 'Uploading…' : 'Upload documents'}</p>
        <p className="text-sm text-taupe mb-4">Drag and drop PDF, JPG or PNG — or choose a file. Max 10MB each.</p>
        <button className="btn-gold" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={16} /> Choose files
        </button>
      </div>

      {docs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
            <input className="input pl-10" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <select className="input pr-8 appearance-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as Category | 'all')}>
              <option value="all">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setSortBy(s => s === 'date' ? 'name' : 'date')} className="btn-outline px-3" title="Toggle sort">
              <ArrowUpDown size={15} /> <span className="hidden sm:inline">{sortBy === 'date' ? 'Date' : 'Name'}</span>
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={docs.length === 0 ? <FileText size={28} /> : <Search size={28} />}
            title={docs.length === 0 ? 'No documents yet' : 'No matches found'}
            description={docs.length === 0 ? 'Upload your first document to get started.' : 'Try adjusting your search or filter.'}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(doc => <DocumentCard key={doc.id} doc={doc} onClick={() => setSelected(doc)} />)}
        </div>
      )}

      <Modal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Rename document"
        size="sm"
        footer={<><button className="btn-ghost" onClick={() => setRenameTarget(null)}>Cancel</button><button className="btn-primary" onClick={handleRename}>Save</button></>}
      >
        <label className="label">Document name</label>
        <input className="input" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete document?"
        message={`This will permanently delete "${deleteTarget?.document_name}" and its extracted data. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <SuggestedActionsModal
        open={!!showActionReview}
        doc={showActionReview}
        actions={showActionReview ? (suggestedActions[showActionReview.id] || []) : []}
        onClose={() => setShowActionReview(null)}
        onApprove={async (approved) => {
          if (!showActionReview) return;
          try {
            await createTasksFromSuggestions(showActionReview.id, approved);
            setSuggestedActions(prev => { const c = { ...prev }; delete c[showActionReview.id]; return c; });
            toast(`${approved.length} task${approved.length === 1 ? '' : 's'} created from this document.`, 'success');
            setShowActionReview(null);
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not create tasks.', 'error');
          }
        }}
      />

      <Modal open={!!previewDoc} onClose={closePreview} title="Document preview" size="xl">
        {previewError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle size={28} className="text-rose mb-3" />
            <p className="text-sm text-espresso font-medium mb-1">Could not load preview</p>
            <p className="text-xs text-taupe mb-4 max-w-sm">{previewError}</p>
            <button className="btn-outline" onClick={() => previewDoc && openPreview(previewDoc)}>
              <Loader2 size={15} /> Retry
            </button>
          </div>
        ) : previewLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-champagne-dark" />
            <p className="text-sm text-taupe ml-3">Loading preview…</p>
          </div>
        ) : previewUrl ? (
          <div className="flex justify-center">
            {previewUrl.toLowerCase().endsWith('pdf') ? (
              <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border border-espresso/10" title="PDF preview" />
            ) : (
              <img src={previewUrl} alt="Document preview" className="max-w-full max-h-[70vh] rounded-lg" />
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function DocumentCard({ doc, onClick }: { doc: DocumentRecord; onClick: () => void }) {
  const meta = CATEGORY_META[doc.category];
  const days = daysUntil(doc.expiry_date);
  const ext = fileExtension(doc.document_name).toUpperCase();

  return (
    <button onClick={onClick} className="card p-4 text-left hover:shadow-lift transition-shadow group">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-ivory-2 flex items-center justify-center shrink-0">
          {isImage(doc.file_type) ? <ImageIcon size={20} className="text-rose" /> : <FileText size={20} className="text-taupe" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-espresso truncate group-hover:text-champagne-dark transition-colors">{doc.document_name}</p>
          <p className="text-xs text-taupe mt-0.5">{ext} · {formatBytes(doc.file_size)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={cn('chip', meta.bg, meta.text)}>{meta.label}</span>
        {doc.extraction_status === 'processing' && (
          <span className="chip bg-champagne/10 text-champagne-dark inline-flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" /> Processing
          </span>
        )}
        {doc.extraction_status === 'extracted' && doc.review_status === 'pending' && (
          <span className="chip bg-sage/10 text-sage inline-flex items-center gap-1"><Sparkles size={11} /> Review</span>
        )}
        {doc.extraction_status === 'extracted' && doc.review_status === 'confirmed' && (
          <span className="chip bg-sage/15 text-sage inline-flex items-center gap-1"><Check size={11} /> Confirmed</span>
        )}
        {days !== null && days <= 30 && (
          <span className={cn('chip', days < 0 ? 'bg-rose/15 text-rose' : 'bg-champagne/15 text-champagne-dark')}>
            {days < 0 ? 'Expired' : `${days}d left`}
          </span>
        )}
      </div>
    </button>
  );
}

function DocumentDetail({ doc, onBack, onRename, onDelete, onPreview, onConfirm, onEditField, suggestedActions, onReviewActions }: {
  doc: DocumentRecord;
  onBack: () => void;
  onRename: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onConfirm: () => void;
  onEditField: (doc: DocumentRecord, field: keyof DocumentRecord, value: string) => void;
  suggestedActions: SuggestedAction[];
  onReviewActions: () => void;
}) {
  const meta = CATEGORY_META[doc.category];
  const ej = doc.extracted_data?.extracted_json;
  const days = daysUntil(doc.expiry_date);
  const ext = fileExtension(doc.document_name).toUpperCase();

  const fields: { key: keyof DocumentRecord; label: string; type?: 'date' }[] = [
    { key: 'document_number', label: 'Document number' },
    { key: 'issue_date', label: 'Issue date', type: 'date' },
    { key: 'expiry_date', label: 'Expiry date', type: 'date' },
    { key: 'issuing_authority', label: 'Issuing authority' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">
      <button onClick={onBack} className="btn-ghost mb-4 -ml-2"><ChevronLeft size={16} /> Back to documents</button>

      <div className="card p-5 sm:p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-ivory-2 flex items-center justify-center shrink-0">
            {isImage(doc.file_type) ? <ImageIcon size={24} className="text-rose" /> : <FileText size={24} className="text-taupe" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-xl sm:text-2xl text-espresso break-words">{doc.document_name}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={cn('chip', meta.bg, meta.text)}>{meta.label}</span>
              <span className="chip bg-ivory-2 text-taupe">{ext}</span>
              <span className="chip bg-ivory-2 text-taupe">{formatBytes(doc.file_size)}</span>
              {days !== null && days <= 30 && (
                <span className={cn('chip', days < 0 ? 'bg-rose/15 text-rose' : 'bg-champagne/15 text-champagne-dark')}>
                  {days < 0 ? 'Expired' : `Expires in ${days}d`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <button className="btn-outline" onClick={onPreview}><Download size={15} /> Preview</button>
          <button className="btn-outline" onClick={onRename}><Pencil size={15} /> Rename</button>
          <button className="btn bg-rose/10 text-rose hover:bg-rose/20 px-5 py-2.5 text-sm rounded-full" onClick={onDelete}><Trash2 size={15} /> Delete</button>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-champagne-dark" />
            <h3 className="font-serif text-lg text-espresso">Extracted information</h3>
          </div>
          {doc.extraction_status === 'extracted' && doc.review_status === 'pending' && (
            <button className="btn-gold" onClick={onConfirm}><Check size={15} /> Confirm details</button>
          )}
          {doc.review_status === 'confirmed' && (
            <span className="chip bg-sage/15 text-sage inline-flex items-center gap-1"><Check size={12} /> Confirmed</span>
          )}
        </div>

        {doc.extraction_status === 'processing' && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <Loader2 size={20} className="animate-spin text-champagne-dark" />
            <p className="text-sm text-taupe">AI is reading your document…</p>
          </div>
        )}

        {doc.extraction_status === 'pending' && <p className="text-sm text-taupe py-4">Extraction has not started yet.</p>}
        {doc.extraction_status === 'skipped' && <p className="text-sm text-taupe py-4">AI extraction was not available. You can fill in the details below manually.</p>}
        {doc.extraction_status === 'failed' && (
          <div className="flex items-start gap-2 text-sm text-rose py-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>Extraction failed. You can still edit the fields below manually.</p>
          </div>
        )}

        {(doc.extraction_status === 'extracted' || doc.extraction_status === 'skipped' || doc.extraction_status === 'failed') && (
          <>
            <div className="mb-4">
              <label className="label">Category</label>
              <select className="input" value={doc.category} onChange={e => onEditField(doc, 'category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <dl className="divide-y divide-espresso/5">
              {fields.map(f => (
                <div key={f.key} className="py-3">
                  <dt className="label">{f.label}</dt>
                  <dd>
                    <input className="input" type={f.type === 'date' ? 'date' : 'text'} value={(doc[f.key] as string) || ''} onChange={e => onEditField(doc, f.key, e.target.value)} placeholder="—" />
                  </dd>
                </div>
              ))}
            </dl>

            {ej?.summary && (
              <div className="mt-4 rounded-xl bg-ivory-2/60 p-4">
                <p className="label">Summary</p>
                <p className="text-sm text-espresso/85 leading-relaxed">{ej.summary}</p>
              </div>
            )}
            {ej?.important_amounts && <div className="mt-3"><p className="label">Important amounts</p><p className="text-sm text-espresso/85">{ej.important_amounts}</p></div>}
            {ej?.important_clauses && <div className="mt-3"><p className="label">Important clauses</p><p className="text-sm text-espresso/85 leading-relaxed">{ej.important_clauses}</p></div>}
            {ej?.other_information && <div className="mt-3"><p className="label">Other information</p><p className="text-sm text-espresso/85 leading-relaxed whitespace-pre-wrap">{ej.other_information}</p></div>}
            {ej?.uncertain && <p className="text-xs text-champagne-dark mt-4 inline-flex items-center gap-1.5"><AlertTriangle size={12} /> Some fields were flagged as uncertain — please review carefully.</p>}

            {suggestedActions.length > 0 && (
              <div className="mt-5 rounded-xl border border-champagne/20 bg-champagne/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ListTodo size={16} className="text-champagne-dark" />
                  <p className="text-sm font-medium text-espresso">AI suggested {suggestedActions.length} action{suggestedActions.length === 1 ? '' : 's'}</p>
                </div>
                <div className="space-y-1.5 mb-3">
                  {suggestedActions.slice(0, 2).map((a, i) => (
                    <div key={i} className="text-xs text-espresso/80 flex items-start gap-2">
                      <span className="text-champagne-dark mt-0.5">•</span>
                      <span className="flex-1">{a.title}{a.deadline ? ` — ${formatDate(a.deadline)}` : ''}</span>
                    </div>
                  ))}
                  {suggestedActions.length > 2 && <p className="text-xs text-taupe">+ {suggestedActions.length - 2} more</p>}
                </div>
                <button onClick={onReviewActions} className="btn-gold text-xs py-2 px-4">
                  <Check size={14} /> Review & approve
                </button>
              </div>
            )}

            <p className="text-xs text-taupe mt-4">Uploaded {relativeTime(doc.created_at)}</p>
          </>
        )}
      </div>
    </div>
  );
}

function SuggestedActionsModal({ open, doc, actions, onClose, onApprove }: {
  open: boolean;
  doc: DocumentRecord | null;
  actions: SuggestedAction[];
  onClose: () => void;
  onApprove: (approved: SuggestedAction[]) => void;
}) {
  const [edited, setEdited] = useState<SuggestedAction[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open && actions.length > 0) {
      setEdited(actions.map(a => ({ ...a })));
      setSelected(new Set(actions.map((_, i) => i)));
    }
  }, [open, actions]);

  function updateField(idx: number, field: keyof SuggestedAction, value: string) {
    setEdited(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value || undefined } : a));
  }

  function toggleSelected(idx: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  const approved = edited.filter((_, i) => selected.has(i));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review suggested actions"
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={approved.length === 0} onClick={() => onApprove(approved)}>
            Create {approved.length} task{approved.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-taupe">
          {doc ? `From "${doc.document_name}"` : ''} — Review each suggested action below. Edit the details, deselect any you don't want, then approve to create tasks linked to this document.
        </p>
        {edited.map((action, idx) => (
          <div key={idx} className={cn(
            'rounded-xl border p-4 transition-colors',
            selected.has(idx) ? 'border-champagne/30 bg-champagne/5' : 'border-espresso/10 bg-ivory-2/30 opacity-60',
          )}>
            <div className="flex items-start gap-3 mb-3">
              <button
                onClick={() => toggleSelected(idx)}
                className={cn(
                  'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                  selected.has(idx) ? 'border-champagne bg-champagne text-white' : 'border-taupe/30',
                )}
              >
                {selected.has(idx) && <Check size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <input
                  className="input text-sm font-medium"
                  value={action.title}
                  onChange={e => updateField(idx, 'title', e.target.value)}
                  placeholder="Action title"
                />
              </div>
            </div>
            <div className="pl-8 space-y-3">
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[50px] resize-y text-sm" value={action.description || ''} onChange={e => updateField(idx, 'description', e.target.value)} placeholder="What needs to be done?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Deadline</label>
                  <input className="input" type="date" value={action.deadline || ''} onChange={e => updateField(idx, 'deadline', e.target.value)} />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={action.priority || 'medium'} onChange={e => updateField(idx, 'priority', e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              {action.source_evidence && (
                <div className="rounded-lg bg-ivory-2/60 p-2.5">
                  <p className="label text-[10px]">Source evidence from document</p>
                  <p className="text-xs text-espresso/70 italic">{action.source_evidence}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {edited.length === 0 && (
          <p className="text-sm text-taupe py-4 text-center">No suggested actions for this document.</p>
        )}
      </div>
    </Modal>
  );
}
