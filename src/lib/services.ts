import { supabase, STORAGE_BUCKET } from './supabase';
import {
  Profile, DocumentRecord, ExtractedDocumentData, Reminder, Checklist, ChecklistItem,
  VaultEntry, AiConversation, AiMessage, Category, ReminderType, Priority, ExtractedJson,
  ChecklistSuggestion, Task, TaskDependency, FollowUp, TaskStatus, SuggestedAction,
} from './types';

/* ---------------- Profile ---------------- */
export async function getProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(uid: string, payload: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: uid, ...payload, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

/* ---------------- Documents ---------------- */
export async function listDocuments(): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*, extracted_data:extracted_document_data(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as DocumentRecord[];
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*, extracted_data:extracted_document_data(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as DocumentRecord | null;
}

export async function uploadDocumentFile(
  userId: string,
  file: File,
): Promise<{ path: string; publicUrl?: string }> {
  const ext = file.name.split('.').pop() || 'bin';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${userId}/${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { path };
}

export async function createDocumentRecord(payload: {
  document_name: string;
  category: Category;
  file_path: string;
  file_type: string;
  file_size: number;
}): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from('documents')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as DocumentRecord;
}

export async function updateDocument(id: string, patch: Partial<DocumentRecord>): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from('documents')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DocumentRecord;
}

export async function deleteDocument(doc: DocumentRecord): Promise<void> {
  // remove storage file
  if (doc.file_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([doc.file_path]);
  }
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) throw error;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/* ---------------- Extracted data ---------------- */
export async function getExtractedData(documentId: string): Promise<ExtractedDocumentData | null> {
  const { data, error } = await supabase
    .from('extracted_document_data')
    .select('*')
    .eq('document_id', documentId)
    .maybeSingle();
  if (error) throw error;
  return data as ExtractedDocumentData | null;
}

export async function saveExtractedData(payload: {
  document_id: string;
  extracted_json: ExtractedJson;
  extracted_text: string | null;
  extraction_model: string;
  extraction_confidence: number | null;
}): Promise<ExtractedDocumentData> {
  // upsert by document_id
  const { data: existing } = await supabase
    .from('extracted_document_data')
    .select('id')
    .eq('document_id', payload.document_id)
    .maybeSingle();
  if (existing) {
    const { data, error } = await supabase
      .from('extracted_document_data')
      .update({
        extracted_json: payload.extracted_json,
        extracted_text: payload.extracted_text,
        extraction_model: payload.extraction_model,
        extraction_confidence: payload.extraction_confidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as ExtractedDocumentData;
  }
  const { data, error } = await supabase.from('extracted_document_data').insert(payload).select().single();
  if (error) throw error;
  return data as ExtractedDocumentData;
}

export async function confirmExtractedData(documentId: string, json: ExtractedJson): Promise<void> {
  const { error } = await supabase
    .from('extracted_document_data')
    .update({ extracted_json: json, user_confirmed: true, updated_at: new Date().toISOString() })
    .eq('document_id', documentId);
  if (error) throw error;
}

/* ---------------- Reminders ---------------- */
export async function listReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*, documents:document_id(document_name)')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as Reminder[];
}

export async function createReminder(payload: {
  title: string;
  description?: string;
  reminder_type: ReminderType;
  due_date: string;
  priority: Priority;
  document_id?: string | null;
}): Promise<Reminder> {
  const { data, error } = await supabase.from('reminders').insert(payload).select().single();
  if (error) throw error;
  return data as Reminder;
}

export async function updateReminder(id: string, patch: Partial<Reminder>): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Reminder;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) throw error;
}

/* ---------------- Checklists ---------------- */
export async function listChecklists(): Promise<Checklist[]> {
  const { data, error } = await supabase
    .from('checklists')
    .select('*, checklist_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Checklist[];
}

export async function createChecklist(payload: {
  title: string;
  situation_type: string;
  description?: string;
}): Promise<Checklist> {
  const { data, error } = await supabase.from('checklists').insert(payload).select().single();
  if (error) throw error;
  return data as Checklist;
}

export async function deleteChecklist(id: string): Promise<void> {
  const { error } = await supabase.from('checklists').delete().eq('id', id);
  if (error) throw error;
}

export async function addChecklistItem(payload: {
  checklist_id: string;
  title: string;
  description?: string;
  is_required: boolean;
}): Promise<ChecklistItem> {
  const { data, error } = await supabase.from('checklist_items').insert(payload).select().single();
  if (error) throw error;
  return data as ChecklistItem;
}

export async function updateChecklistItem(id: string, patch: Partial<ChecklistItem>): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id);
  if (error) throw error;
}

export async function saveSuggestedChecklist(suggestion: ChecklistSuggestion, situation: string): Promise<Checklist> {
  const checklist = await createChecklist({
    title: suggestion.title,
    situation_type: situation,
    description: suggestion.description,
  });
  const items = suggestion.items.map(it => ({
    checklist_id: checklist.id,
    title: it.title,
    description: it.description || null,
    is_required: it.is_required,
  }));
  if (items.length) {
    const { error } = await supabase.from('checklist_items').insert(items);
    if (error) throw error;
  }
  const { data, error } = await supabase
    .from('checklists')
    .select('*, checklist_items(*)')
    .eq('id', checklist.id)
    .single();
  if (error) throw error;
  return data as Checklist;
}

/* ---------------- Vault ---------------- */
export async function listVaultEntries(): Promise<VaultEntry[]> {
  const { data, error } = await supabase.from('vault_entries').select('*').order('category', { ascending: true });
  if (error) throw error;
  return (data || []) as VaultEntry[];
}

export async function createVaultEntry(payload: {
  field_name: string;
  protected_field_value: string;
  category: string;
}): Promise<VaultEntry> {
  const { data, error } = await supabase.from('vault_entries').insert(payload).select().single();
  if (error) throw error;
  return data as VaultEntry;
}

export async function updateVaultEntry(id: string, patch: Partial<VaultEntry>): Promise<void> {
  const { error } = await supabase
    .from('vault_entries')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteVaultEntry(id: string): Promise<void> {
  const { error } = await supabase.from('vault_entries').delete().eq('id', id);
  if (error) throw error;
}

/* ---------------- AI Conversations ---------------- */
export async function listConversations(): Promise<AiConversation[]> {
  const { data, error } = await supabase.from('ai_conversations').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as AiConversation[];
}

export async function createConversation(title = 'New conversation'): Promise<AiConversation> {
  const { data, error } = await supabase.from('ai_conversations').insert({ title }).select().single();
  if (error) throw error;
  return data as AiConversation;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('ai_conversations').delete().eq('id', id);
  if (error) throw error;
}

export async function listMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as AiMessage[];
}

export async function addMessage(payload: {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AiMessage['sources'];
}): Promise<AiMessage> {
  const { data, error } = await supabase.from('ai_messages').insert(payload).select().single();
  if (error) throw error;
  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', payload.conversation_id);
  return data as AiMessage;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/* ---------------- Tasks ---------------- */
export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, documents:document_id(document_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Task[];
}

export async function createTask(payload: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  deadline?: string | null;
  document_id?: string | null;
  source_evidence?: string | null;
  ai_suggested?: boolean;
  approved?: boolean;
  reminder_enabled?: boolean;
}): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(payload).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function createTasksFromSuggestions(
  documentId: string,
  suggestions: SuggestedAction[],
): Promise<Task[]> {
  const rows = suggestions.map(s => ({
    title: s.title,
    description: s.description || null,
    deadline: s.deadline || null,
    priority: s.priority || 'medium',
    document_id: documentId,
    source_evidence: s.source_evidence || null,
    ai_suggested: true,
    approved: true,
    status: 'not_started' as TaskStatus,
  }));
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from('tasks').insert(rows).select();
  if (error) throw error;
  return (data || []) as Task[];
}

/* ---------------- Task Dependencies ---------------- */
export async function listDependencies(): Promise<TaskDependency[]> {
  const { data, error } = await supabase.from('task_dependencies').select('*');
  if (error) throw error;
  return (data || []) as TaskDependency[];
}

export async function addDependency(taskId: string, prerequisiteId: string): Promise<TaskDependency> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, prerequisite_task_id: prerequisiteId })
    .select()
    .single();
  if (error) throw error;
  return data as TaskDependency;
}

export async function removeDependency(id: string): Promise<void> {
  const { error } = await supabase.from('task_dependencies').delete().eq('id', id);
  if (error) throw error;
}

/* ---------------- Follow-ups ---------------- */
export async function listFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('*, documents:document_id(document_name)')
    .order('expected_response_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []) as unknown as FollowUp[];
}

export async function createFollowUp(payload: {
  title: string;
  description?: string;
  document_id?: string | null;
  task_id?: string | null;
  submission_date?: string | null;
  expected_response_date?: string | null;
  contact_info?: string | null;
  follow_up_message?: string | null;
}): Promise<FollowUp> {
  const { data, error } = await supabase.from('follow_ups').insert(payload).select().single();
  if (error) throw error;
  return data as FollowUp;
}

export async function updateFollowUp(id: string, patch: Partial<FollowUp>): Promise<FollowUp> {
  const { data, error } = await supabase
    .from('follow_ups')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as FollowUp;
}

export async function deleteFollowUp(id: string): Promise<void> {
  const { error } = await supabase.from('follow_ups').delete().eq('id', id);
  if (error) throw error;
}
