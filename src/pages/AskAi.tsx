import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MessageSquareText, Send, Sparkles, Plus, Trash2, FileText, Loader2, ChevronLeft,
  Paperclip, X, Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import {
  listConversations, createConversation, deleteConversation, listMessages, addMessage,
} from '@/lib/services';
import { askDocuments } from '@/lib/ai';
import { AiConversation, AiMessage, ChatAttachment } from '@/lib/types';
import { cn, relativeTime, formatBytes, isImage, fileExtension } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';

const SUGGESTED_PROMPTS = [
  'When does my insurance expire?',
  'What is my policy number?',
  'Summarize my admission letter.',
  'Find my education certificate.',
  'Which documents need attention this month?',
  'What information is in my agreement?',
];

const ALLOWED_ATT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
const MAX_ATT_SIZE = 15 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

function validateAttachment(file: File): string | null {
  if (!ALLOWED_ATT_TYPES.includes(file.type)) {
    return `${file.name}: unsupported type. Use PDF, JPG, PNG, WebP, or GIF.`;
  }
  if (file.size > MAX_ATT_SIZE) {
    return `${file.name} is larger than 15MB.`;
  }
  return null;
}

async function fileToAttachment(file: File): Promise<ChatAttachment> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...(uint8.subarray(i, i + chunkSize) as unknown as number[]));
  }
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    data: btoa(binary),
  };
}

export function AskAi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AiConversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<{ name: string; type: string; url: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const loadConvos = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const c = await listConversations();
      setConversations(c);
      if (c.length > 0 && !activeId) setActiveId(c[0].id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load conversations.', 'error');
    } finally {
      setLoadingConvos(false);
    }
  }, [toast, activeId]);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  const loadMessages = useCallback(async (id: string) => {
    setLoadingMsgs(true);
    try {
      setMessages(await listMessages(id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load messages.', 'error');
    } finally {
      setLoadingMsgs(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  function clearAttachments() {
    attachmentPreviews.forEach(p => URL.revokeObjectURL(p.url));
    setAttachments([]);
    setAttachmentPreviews([]);
  }

  async function handleAddFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    if (attachments.length + arr.length > MAX_ATTACHMENTS) {
      toast(`You can attach at most ${MAX_ATTACHMENTS} files at once.`, 'error');
      return;
    }
    for (const file of arr) {
      const err = validateAttachment(file);
      if (err) { toast(err, 'error'); continue; }
      try {
        const att = await fileToAttachment(file);
        setAttachments(prev => [...prev, att]);
        setAttachmentPreviews(prev => [...prev, { name: file.name, type: file.type, url: URL.createObjectURL(file) }]);
      } catch {
        toast(`Could not read ${file.name}.`, 'error');
      }
    }
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
    const preview = attachmentPreviews[idx];
    if (preview) URL.revokeObjectURL(preview.url);
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleNewConversation() {
    try {
      const c = await createConversation('New conversation');
      setConversations(prev => [c, ...prev]);
      setActiveId(c.id);
      setShowSidebar(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create conversation.', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteConversation(deleteTarget.id);
      setConversations(prev => prev.filter(c => c.id !== deleteTarget.id));
      if (activeId === deleteTarget.id) setActiveId(null);
      toast('Conversation deleted.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  }

  async function handleSend(text?: string) {
    const question = (text || input).trim();
    if ((!question && attachments.length === 0) || sending) return;

    let convoId = activeId;
    if (!convoId) {
      try {
        const c = await createConversation(question.slice(0, 40) || 'New conversation');
        convoId = c.id;
        setConversations(prev => [c, ...prev]);
        setActiveId(c.id);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not start conversation.', 'error');
        return;
      }
    }

    setInput('');
    setSending(true);
    const currentAttachments = [...attachments];
    const currentPreviews = [...attachmentPreviews];
    clearAttachments();

    const tempUser: AiMessage = {
      id: 'temp-' + Date.now(), conversation_id: convoId, user_id: user?.id || '',
      role: 'user', content: question || '(attachment only)',
      sources: null, attachments: currentAttachments.length > 0 ? currentAttachments : null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUser]);

    try {
      const res = await askDocuments(question, convoId, currentAttachments.length > 0 ? currentAttachments : undefined);
      // Save attachment metadata without the base64 data to keep DB rows small
      const dbAttachments: ChatAttachment[] | undefined = currentAttachments.length > 0
        ? currentAttachments.map(a => ({ name: a.name, type: a.type, size: a.size, data: '' }))
        : undefined;
      const savedUser = await addMessage({
        conversation_id: convoId, role: 'user', content: question || '(attachment only)',
        attachments: dbAttachments,
      });
      const savedAssistant = await addMessage({
        conversation_id: convoId, role: 'assistant', content: res.answer, sources: res.sources,
      });
      // Replace temp message; restore preview URLs for display
      const displayUser: AiMessage = {
        ...savedUser,
        attachments: currentAttachments.length > 0
          ? currentAttachments.map((a, i) => ({ ...a, data: currentPreviews[i]?.url || '' }))
          : null,
      };
      setMessages(prev => [...prev.filter(m => m.id !== tempUser.id), displayUser, savedAssistant]);
      if (!res.available) toast('AI is not configured. See settings to enable.', 'info');
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempUser.id));
      // Restore attachments so the user can retry
      setAttachments(currentAttachments);
      setAttachmentPreviews(currentPreviews);
      toast(e instanceof Error ? e.message : 'Could not get a response.', 'error');
    } finally {
      setSending(false);
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current++;
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current--;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
  }

  return (
    <div
      className="flex h-[calc(100vh-4rem)] lg:h-screen"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <aside className={cn(
        'absolute lg:relative z-20 left-0 top-16 lg:top-0 h-[calc(100vh-4rem)] lg:h-full w-72 bg-card border-r border-espresso/5 flex flex-col transition-transform lg:translate-x-0',
        showSidebar ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="p-4 border-b border-espresso/5">
          <button className="btn-gold w-full" onClick={handleNewConversation}><Plus size={15} /> New conversation</button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin p-2 space-y-1">
          {loadingConvos ? (
            <div className="p-2 space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-taupe text-center py-6">No conversations yet.</p>
          ) : (
            conversations.map(c => (
              <div key={c.id} className="group relative">
                <button
                  onClick={() => { setActiveId(c.id); setShowSidebar(false); }}
                  className={cn('w-full text-left p-3 rounded-xl transition-colors', activeId === c.id ? 'bg-champagne/12' : 'hover:bg-ivory-2')}
                >
                  <p className="text-sm font-medium text-espresso truncate pr-6">{c.title}</p>
                  <p className="text-xs text-taupe mt-0.5">{relativeTime(c.updated_at)}</p>
                </button>
                <button
                  onClick={() => setDeleteTarget(c)}
                  className="absolute right-2 top-2.5 text-taupe opacity-0 group-hover:opacity-100 hover:text-rose transition-all p-1"
                  aria-label="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {showSidebar && <div className="absolute inset-0 z-10 bg-espresso/20 lg:hidden" onClick={() => setShowSidebar(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-2 p-3 border-b border-espresso/5 bg-card">
          <button onClick={() => setShowSidebar(true)} className="text-espresso p-1"><ChevronLeft size={20} /></button>
          <span className="text-sm font-medium text-espresso">Ask your documents</span>
        </div>

        {!activeId && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-champagne/12 flex items-center justify-center text-champagne-dark mb-4">
              <MessageSquareText size={28} />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-espresso text-center mb-2">Ask anything about your documents.</h2>
            <p className="text-sm text-taupe text-center max-w-md mb-8">Your AI assistant answers using only your uploaded documents — with sources you can trust. You can also attach images and PDFs directly to your questions.</p>
            <div className="grid sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
              {SUGGESTED_PROMPTS.map(p => (
                <button key={p} onClick={() => handleSend(p)} className="card p-3.5 text-left text-sm text-espresso hover:shadow-lift hover:border-champagne/30 transition-all">{p}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto scroll-thin px-4 sm:px-6 py-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {loadingMsgs ? (
                  <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
                ) : messages.length === 0 ? (
                  <EmptyState icon={<Sparkles size={24} />} title="Start the conversation" description="Ask a question, or attach an image or PDF for the AI to analyze." />
                ) : (
                  messages.map(m => <MessageBubble key={m.id} message={m} />)
                )}
                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-champagne/15 flex items-center justify-center shrink-0">
                      <Sparkles size={15} className="text-champagne-dark" />
                    </div>
                    <div className="card p-3.5 flex items-center gap-2">
                      <Loader2 size={15} className="animate-spin text-champagne-dark" />
                      <span className="text-sm text-taupe">Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-espresso/5 bg-card p-3 sm:p-4">
              <div className="max-w-3xl mx-auto">
                {/* Attachment previews */}
                {attachmentPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachmentPreviews.map((p, i) => (
                      <div key={i} className="relative group rounded-xl border border-espresso/10 bg-ivory-2/50 p-2 pr-8 flex items-center gap-2 max-w-[200px]">
                        <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center shrink-0">
                          {isImage(p.type) ? <ImageIcon size={15} className="text-rose" /> : <FileText size={15} className="text-taupe" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-espresso truncate">{p.name}</p>
                          <p className="text-[10px] text-taupe">{fileExtension(p.name).toUpperCase()}</p>
                        </div>
                        <button
                          onClick={() => removeAttachment(i)}
                          className="absolute right-1.5 top-1.5 p-0.5 rounded text-taupe hover:text-rose hover:bg-rose/10 transition-colors"
                          aria-label="Remove attachment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-ghost p-2.5 shrink-0"
                    title="Attach image or PDF"
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    className="input flex-1"
                    placeholder={attachments.length > 0 ? "Ask about the attached file(s)…" : "Ask about your documents…"}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    disabled={sending}
                  />
                  <button className="btn-primary px-4" onClick={() => handleSend()} disabled={sending || (!input.trim() && attachments.length === 0)} aria-label="Send">
                    <Send size={16} />
                  </button>
                </div>
                {messages.length === 0 && (
                  <div className="max-w-3xl mx-auto mt-3 flex flex-wrap gap-2">
                    {SUGGESTED_PROMPTS.slice(0, 3).map(p => (
                      <button key={p} onClick={() => handleSend(p)} className="chip bg-ivory-2 text-taupe hover:text-espresso hover:bg-champagne/10 transition-colors">{p}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete conversation?"
        message="This will permanently delete the conversation and all its messages."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user';
  const attachments = message.attachments || [];

  return (
    <div className={cn('flex items-start gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', isUser ? 'bg-espresso/8' : 'bg-champagne/15')}>
        {isUser ? <span className="text-xs font-semibold text-espresso">You</span> : <Sparkles size={15} className="text-champagne-dark" />}
      </div>
      <div className={cn('max-w-[80%] sm:max-w-[75%]', isUser && 'text-right')}>
        {/* Attachments above the text bubble */}
        {attachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-2 mb-2', isUser && 'justify-end')}>
            {attachments.map((att, i) => {
              const isImg = isImage(att.type);
              const src = att.data || '';
              return (
                <div key={i} className="rounded-xl border border-espresso/10 bg-card overflow-hidden max-w-[200px]">
                  {isImg && src ? (
                    <img src={src} alt={att.name} className="w-full max-h-40 object-cover" />
                  ) : (
                    <div className="flex items-center gap-2 p-3">
                      <div className="w-9 h-9 rounded-lg bg-ivory-2 flex items-center justify-center shrink-0">
                        <FileText size={17} className="text-taupe" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium text-espresso truncate">{att.name}</p>
                        <p className="text-[10px] text-taupe">{fileExtension(att.name).toUpperCase()} · {formatBytes(att.size)}</p>
                      </div>
                    </div>
                  )}
                  {isImg && src && (
                    <p className="text-[10px] text-taupe px-2 pb-1.5 truncate">{att.name}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser ? 'bg-espresso text-ivory rounded-tr-sm' : 'bg-card border border-espresso/5 text-espresso rounded-tl-sm',
        )}>
          {message.content}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-taupe uppercase tracking-wide self-center">Sources:</span>
            {message.sources.map((s, i) => (
              <span key={i} className="chip bg-ivory-2 text-taupe inline-flex items-center gap-1"><FileText size={10} /> {s.document_name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
