import { supabase } from './supabase';
import {
  ChecklistSuggestion, ExtractedJson, LifeInsight, DocumentRecord, Reminder,
  Task, TaskDependency, SuggestedAction, DeadlineBriefingItem, ChatAttachment,
} from './types';

const FUNCTION_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  const headers: Record<string, string> = {
    ...authHeaders(),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${FUNCTION_BASE}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.error) msg = err.error;
    } catch { /* ignore parse error */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return data as T;
}

export interface ExtractResponse {
  extracted: ExtractedJson | null;
  extracted_text: string | null;
  model: string;
  confidence: number | null;
  category: string;
  note?: string;
  available: boolean;
  suggested_actions?: SuggestedAction[];
}

export async function extractDocument(
  documentId: string,
  filePath: string,
  mimeType: string,
  fileName: string,
): Promise<ExtractResponse> {
  return callFunction<ExtractResponse>('ai-extract', {
    documentId, filePath, mimeType, fileName,
  });
}

export interface AskResponse {
  answer: string;
  sources: { document_name: string; document_id: string }[];
  available: boolean;
}

export async function askDocuments(
  question: string,
  conversationId: string | null,
  attachments?: ChatAttachment[],
): Promise<AskResponse> {
  return callFunction<AskResponse>('ai-ask', { question, conversationId, attachments });
}

export interface ChecklistResponse {
  suggestion: ChecklistSuggestion;
  available: boolean;
}

export async function generateChecklist(situation: string): Promise<ChecklistResponse> {
  return callFunction<ChecklistResponse>('ai-checklist', { situation });
}

export interface InsightsResponse {
  insights: LifeInsight[];
  available: boolean;
}

export async function generateLifeInsights(): Promise<InsightsResponse> {
  return callFunction<InsightsResponse>('ai-insights', {});
}

// Local fallback insight generator — uses real user data, no AI.
export function localInsights(docs: DocumentRecord[], reminders: Reminder[]): LifeInsight[] {
  const out: LifeInsight[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  for (const d of docs) {
    if (!d.expiry_date) continue;
    const exp = new Date(d.expiry_date); exp.setHours(0, 0, 0, 0);
    const days = Math.round((exp.getTime() - today.getTime()) / 86400000);
    if (days < 0) {
      out.push({
        id: `exp-${d.id}`,
        severity: 'alert',
        title: `${d.document_name} has expired`,
        detail: `This ${d.category.toLowerCase()} document expired on ${exp.toLocaleDateString()}. Consider renewing it as soon as possible.`,
        document_id: d.id,
      });
    } else if (days <= 30) {
      out.push({
        id: `exp-${d.id}`,
        severity: days <= 7 ? 'alert' : 'warning',
        title: `${d.document_name} expires in ${days} day${days === 1 ? '' : 's'}`,
        detail: `This ${d.category.toLowerCase()} document expires on ${exp.toLocaleDateString()}. Review its renewal requirements.`,
        document_id: d.id,
      });
    } else if (days <= 90) {
      out.push({
        id: `exp-${d.id}`,
        severity: 'info',
        title: `${d.document_name} expires in ${days} days`,
        detail: `Plan ahead — this ${d.category.toLowerCase()} document expires on ${exp.toLocaleDateString()}.`,
        document_id: d.id,
      });
    }
  }

  const pending = reminders.filter(r => r.status === 'pending' && new Date(r.due_date) < today);
  if (pending.length > 0) {
    out.push({
      id: 'overdue-reminders',
      severity: 'alert',
      title: `${pending.length} overdue reminder${pending.length === 1 ? '' : 's'}`,
      detail: `You have ${pending.length} reminder${pending.length === 1 ? '' : 's'} past their due date. Review them in Reminders.`,
    });
  }

  const unreviewed = docs.filter(d => d.extraction_status === 'extracted' && d.review_status === 'pending');
  if (unreviewed.length > 0) {
    out.push({
      id: 'review-pending',
      severity: 'info',
      title: `${unreviewed.length} document${unreviewed.length === 1 ? '' : 's'} awaiting review`,
      detail: `Confirm the extracted details for ${unreviewed.length} of your documents to keep your records accurate.`,
      document_id: unreviewed[0].id,
    });
  }

  return out.slice(0, 8);
}

// Deadline Intelligence — local fallback computed from real task/dependency data.
// No fabricated insights: every item references a real task or document.
export function localDeadlineBriefing(
  tasks: Task[],
  deps: TaskDependency[],
  docs: DocumentRecord[],
  reminders: Reminder[],
): DeadlineBriefingItem[] {
  const out: DeadlineBriefingItem[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Map of task_id -> set of prerequisite task_ids
  const prereqMap = new Map<string, string[]>();
  for (const d of deps) {
    const arr = prereqMap.get(d.task_id) || [];
    arr.push(d.prerequisite_task_id);
    prereqMap.set(d.task_id, arr);
  }

  for (const t of tasks) {
    if (t.status === 'completed') continue;
    if (!t.deadline) continue;

    const dl = new Date(t.deadline); dl.setHours(0, 0, 0, 0);
    const days = Math.round((dl.getTime() - today.getTime()) / 86400000);

    // Check if prerequisites are incomplete (blocked)
    const prereqs = prereqMap.get(t.id) || [];
    const incompletePrereqs = prereqs
      .map(pid => tasks.find(tk => tk.id === pid))
      .filter(p => p && p.status !== 'completed');

    if (days < 0) {
      out.push({
        id: `dl-overdue-${t.id}`,
        severity: 'alert',
        title: `Overdue: ${t.title}`,
        detail: `This task was due ${dl.toLocaleDateString()} and is still ${t.status === 'not_started' ? 'not started' : 'in progress'}.${incompletePrereqs.length > 0 ? ` Blocked by ${incompletePrereqs.length} incomplete prerequisite(s).` : ''}`,
        task_id: t.id,
        document_id: t.document_id || undefined,
      });
    } else if (days <= 7) {
      const blockedNote = incompletePrereqs.length > 0
        ? ` ${incompletePrereqs.length} prerequisite(s) still incomplete — you may not have enough time.`
        : '';
      out.push({
        id: `dl-soon-${t.id}`,
        severity: 'alert',
        title: `Due in ${days} day${days === 1 ? '' : 's'}: ${t.title}`,
        detail: `Deadline is ${dl.toLocaleDateString()}. Priority: ${t.priority}.${blockedNote}`,
        task_id: t.id,
        document_id: t.document_id || undefined,
      });
    } else if (days <= 30) {
      const blockedNote = incompletePrereqs.length > 0
        ? ` ${incompletePrereqs.length} prerequisite(s) still incomplete.`
        : '';
      out.push({
        id: `dl-upcoming-${t.id}`,
        severity: 'warning',
        title: `Due in ${days} days: ${t.title}`,
        detail: `Deadline is ${dl.toLocaleDateString()}. Priority: ${t.priority}.${blockedNote}`,
        task_id: t.id,
        document_id: t.document_id || undefined,
      });
    }
  }

  // Also surface waiting tasks with no expected response date context
  const waiting = tasks.filter(t => t.status === 'waiting' && !t.deadline);
  if (waiting.length > 0) {
    out.push({
      id: 'dl-waiting',
      severity: 'info',
      title: `${waiting.length} task${waiting.length === 1 ? '' : 's'} waiting for a response`,
      detail: `You have ${waiting.length} task${waiting.length === 1 ? '' : 's'} in "Waiting for response" status. Consider creating follow-up requests to track them.`,
      task_id: waiting[0].id,
    });
  }

  return out.slice(0, 10);
}
