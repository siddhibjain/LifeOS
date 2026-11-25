export type Category =
  | 'Identity' | 'Education' | 'Finance' | 'Insurance'
  | 'Medical' | 'Travel' | 'Property' | 'Other';

export const CATEGORIES: Category[] = [
  'Identity', 'Education', 'Finance', 'Insurance',
  'Medical', 'Travel', 'Property', 'Other',
];

export type ReminderType =
  | 'Expiry' | 'Renewal' | 'Payment' | 'Application' | 'Personal' | 'Other';

export const REMINDER_TYPES: ReminderType[] = [
  'Expiry', 'Renewal', 'Payment', 'Application', 'Personal', 'Other',
];

export type Priority = 'low' | 'medium' | 'high';
export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export type ReminderStatus = 'pending' | 'completed';
export type ExtractionStatus = 'pending' | 'processing' | 'extracted' | 'failed' | 'skipped';
export type ReviewStatus = 'pending' | 'confirmed' | 'edited';

export interface Profile {
  id: string;
  full_name: string | null;
  country: string | null;
  phone: string | null;
  reminder_preferences: { intervals?: number[] };
  notification_enabled: boolean;
  interests: string[] | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  document_name: string;
  category: Category;
  file_path: string;
  file_type: string;
  file_size: number;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  document_number: string | null;
  extraction_status: ExtractionStatus;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
  extracted_data?: ExtractedDocumentData | null;
}

export interface ExtractedJson {
  document_type?: string | null;
  name?: string | null;
  document_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  issuing_authority?: string | null;
  important_amounts?: string | null;
  important_clauses?: string | null;
  other_information?: string | null;
  summary?: string | null;
  uncertain?: boolean;
  category?: string | null;
}

export interface ExtractedDocumentData {
  id: string;
  document_id: string;
  user_id: string;
  extracted_json: ExtractedJson | null;
  extracted_text: string | null;
  extraction_model: string | null;
  extraction_confidence: number | null;
  user_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  description: string | null;
  reminder_type: ReminderType;
  due_date: string;
  priority: Priority;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
  documents?: Pick<DocumentRecord, 'document_name'> | null;
}

export interface Checklist {
  id: string;
  user_id: string;
  title: string;
  situation_type: string;
  description: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  checklist_items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaultEntry {
  id: string;
  user_id: string;
  field_name: string;
  protected_field_value: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface AiConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  data: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: { document_name: string; document_id: string }[] | null;
  attachments: ChatAttachment[] | null;
  created_at: string;
}

export interface ChecklistSuggestionItem {
  title: string;
  description?: string;
  is_required: boolean;
}

export interface ChecklistSuggestion {
  title: string;
  description: string;
  items: ChecklistSuggestionItem[];
}

export interface LifeInsight {
  id: string;
  severity: 'info' | 'warning' | 'alert';
  title: string;
  detail: string;
  document_id?: string;
  task_id?: string;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed';
export const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'waiting', 'completed'];

export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
  not_started: { label: 'Not started', color: 'text-taupe', bg: 'bg-ivory-2', dot: 'bg-taupe' },
  in_progress: { label: 'In progress', color: 'text-sage', bg: 'bg-sage/12', dot: 'bg-sage' },
  waiting: { label: 'Waiting for response', color: 'text-champagne-dark', bg: 'bg-champagne/12', dot: 'bg-champagne' },
  completed: { label: 'Completed', color: 'text-espresso', bg: 'bg-espresso/8', dot: 'bg-espresso' },
};

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null;
  document_id: string | null;
  source_evidence: string | null;
  reminder_enabled: boolean;
  ai_suggested: boolean;
  approved: boolean;
  created_at: string;
  updated_at: string;
  documents?: Pick<DocumentRecord, 'document_name'> | null;
}

export interface TaskDependency {
  id: string;
  user_id: string;
  task_id: string;
  prerequisite_task_id: string;
  created_at: string;
}

export type FollowUpStatus = 'pending' | 'responded' | 'overdue';

export const FOLLOW_UP_STATUS_META: Record<FollowUpStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-champagne-dark', bg: 'bg-champagne/12' },
  responded: { label: 'Responded', color: 'text-sage', bg: 'bg-sage/12' },
  overdue: { label: 'Overdue', color: 'text-rose', bg: 'bg-rose/12' },
};

export interface FollowUp {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  document_id: string | null;
  task_id: string | null;
  submission_date: string | null;
  expected_response_date: string | null;
  status: FollowUpStatus;
  contact_info: string | null;
  follow_up_message: string | null;
  created_at: string;
  updated_at: string;
  documents?: Pick<DocumentRecord, 'document_name'> | null;
}

export interface SuggestedAction {
  title: string;
  description?: string;
  deadline?: string | null;
  priority?: Priority;
  source_evidence?: string;
}

export interface DeadlineBriefingItem {
  id: string;
  severity: 'alert' | 'warning' | 'info';
  title: string;
  detail: string;
  task_id?: string;
  document_id?: string;
}

export type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

export type AppRoute =
  | 'dashboard' | 'documents' | 'ask' | 'reminders'
  | 'checklists' | 'vault' | 'settings'
  | 'actions' | 'lifegraph' | 'followups' | 'calendar';
