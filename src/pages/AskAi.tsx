import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MessageSquareText, Send, Sparkles, Plus, Trash2, FileText, Loader2, ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import {
  listConversations, createConversation, deleteConversation, listMessages, addMessage,
} from '@/lib/services';
import { askDocuments } from '@/lib/ai';
import { AiConversation, AiMessage } from '@/lib/types';
import { cn, relativeTime } from '@/lib/utils';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!question || sending) return;

    let convoId = activeId;
    if (!convoId) {
      try {
        const c = await createConversation(question.slice(0, 40));
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
    const tempUser: AiMessage = {
      id: 'temp-' + Date.now(), conversation_id: convoId, user_id: user?.id || '',
      role: 'user', content: question, sources: null, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUser]);

    try {
      const res = await askDocuments(question, convoId);
      const savedUser = await addMessage({ conversation_id: convoId, role: 'user', content: question });
      const savedAssistant = await addMessage({
        conversation_id: convoId, role: 'assistant', content: res.answer, sources: res.sources,
      });
      setMessages(prev => [...prev.filter(m => m.id !== tempUser.id), savedUser, savedAssistant]);
      if (!res.available) toast('AI is not configured. See settings to enable.', 'info');
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempUser.id));
      toast(e instanceof Error ? e.message : 'Could not get a response.', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen">
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
            <p className="text-sm text-taupe text-center max-w-md mb-8">Your AI assistant answers using only your uploaded documents — with sources you can trust.</p>
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
                  <EmptyState icon={<Sparkles size={24} />} title="Start the conversation" description="Ask a question using the prompts below or type your own." />
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
              <div className="max-w-3xl mx-auto flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Ask about your documents…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={sending}
                />
                <button className="btn-primary px-4" onClick={() => handleSend()} disabled={sending || !input.trim()} aria-label="Send">
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
  return (
    <div className={cn('flex items-start gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', isUser ? 'bg-espresso/8' : 'bg-champagne/15')}>
        {isUser ? <span className="text-xs font-semibold text-espresso">You</span> : <Sparkles size={15} className="text-champagne-dark" />}
      </div>
      <div className={cn('max-w-[80%] sm:max-w-[75%]', isUser && 'text-right')}>
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
