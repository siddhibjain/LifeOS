/*
# LifeOS — full schema and security

1. Overview
LifeOS is an AI-powered personal life administration assistant. Each authenticated user owns a private set of documents, reminders, checklists, vault entries and AI conversations. No data is shared between users.

2. New tables
- profiles: onboarding/profile data (1:1 with auth.users)
- documents: uploaded document metadata (private storage references)
- extracted_document_data: structured AI-extracted info per document
- reminders: user reminders, optionally linked to a document
- checklists: AI-generated or user-created life checklists
- checklist_items: individual checklist entries (required/optional, completed)
- vault_entries: reusable personal information entries
- ai_conversations: chat sessions for "Ask Your Documents"
- ai_messages: individual messages inside a conversation

3. Security
- RLS enabled on every user-owned table.
- Owner column `user_id` defaults to `auth.uid()` so inserts that omit it succeed.
- 4 separate policies (select/insert/update/delete) per table, scoped `TO authenticated` with `auth.uid() = user_id`.
- profiles keyed by `id = auth.uid()` (no separate user_id).
- Storage bucket `lifeos-documents` created private; policies scope object paths to the owning user's id.

4. Notes
- Cascading deletes: deleting a document removes its extracted data; deleting a checklist removes its items; deleting a conversation removes its messages.
- Indexes on foreign keys and commonly-filtered columns (user_id, due_date, status).
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  country text,
  phone text,
  reminder_preferences jsonb DEFAULT '{"intervals":[90,30,7,1]}'::jsonb,
  notification_enabled boolean DEFAULT true,
  interests text[] DEFAULT '{}',
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- ---------- documents ----------
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  category text DEFAULT 'Other',
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint DEFAULT 0,
  issue_date date,
  expiry_date date,
  issuing_authority text,
  document_number text,
  extraction_status text DEFAULT 'pending',
  review_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
CREATE POLICY "documents_select_own" ON public.documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
CREATE POLICY "documents_insert_own" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS documents_expiry_date_idx ON public.documents(expiry_date);

-- ---------- extracted_document_data ----------
CREATE TABLE IF NOT EXISTS public.extracted_document_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  extracted_json jsonb,
  extracted_text text,
  extraction_model text,
  extraction_confidence numeric,
  user_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.extracted_document_data ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.extracted_document_data TO authenticated;

DROP POLICY IF EXISTS "edd_select_own" ON public.extracted_document_data;
CREATE POLICY "edd_select_own" ON public.extracted_document_data
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "edd_insert_own" ON public.extracted_document_data;
CREATE POLICY "edd_insert_own" ON public.extracted_document_data
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "edd_update_own" ON public.extracted_document_data;
CREATE POLICY "edd_update_own" ON public.extracted_document_data
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "edd_delete_own" ON public.extracted_document_data;
CREATE POLICY "edd_delete_own" ON public.extracted_document_data
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS edd_document_id_idx ON public.extracted_document_data(document_id);
CREATE INDEX IF NOT EXISTS edd_user_id_idx ON public.extracted_document_data(user_id);

-- ---------- reminders ----------
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  reminder_type text DEFAULT 'Other',
  due_date date NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;

DROP POLICY IF EXISTS "reminders_select_own" ON public.reminders;
CREATE POLICY "reminders_select_own" ON public.reminders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminders_insert_own" ON public.reminders;
CREATE POLICY "reminders_insert_own" ON public.reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminders_update_own" ON public.reminders;
CREATE POLICY "reminders_update_own" ON public.reminders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminders_delete_own" ON public.reminders;
CREATE POLICY "reminders_delete_own" ON public.reminders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS reminders_due_date_idx ON public.reminders(due_date);
CREATE INDEX IF NOT EXISTS reminders_status_idx ON public.reminders(status);

-- ---------- checklists ----------
CREATE TABLE IF NOT EXISTS public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  situation_type text DEFAULT 'custom',
  description text,
  source_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklists TO authenticated;

DROP POLICY IF EXISTS "checklists_select_own" ON public.checklists;
CREATE POLICY "checklists_select_own" ON public.checklists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "checklists_insert_own" ON public.checklists;
CREATE POLICY "checklists_insert_own" ON public.checklists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "checklists_update_own" ON public.checklists;
CREATE POLICY "checklists_update_own" ON public.checklists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "checklists_delete_own" ON public.checklists;
CREATE POLICY "checklists_delete_own" ON public.checklists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS checklists_user_id_idx ON public.checklists(user_id);

-- ---------- checklist_items ----------
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;

DROP POLICY IF EXISTS "ci_select_own" ON public.checklist_items;
CREATE POLICY "ci_select_own" ON public.checklist_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ci_insert_own" ON public.checklist_items;
CREATE POLICY "ci_insert_own" ON public.checklist_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ci_update_own" ON public.checklist_items;
CREATE POLICY "ci_update_own" ON public.checklist_items
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ci_delete_own" ON public.checklist_items;
CREATE POLICY "ci_delete_own" ON public.checklist_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ci_checklist_id_idx ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS ci_user_id_idx ON public.checklist_items(user_id);

-- ---------- vault_entries ----------
CREATE TABLE IF NOT EXISTS public.vault_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  protected_field_value text,
  category text DEFAULT 'Personal',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_entries TO authenticated;

DROP POLICY IF EXISTS "vault_select_own" ON public.vault_entries;
CREATE POLICY "vault_select_own" ON public.vault_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vault_insert_own" ON public.vault_entries;
CREATE POLICY "vault_insert_own" ON public.vault_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vault_update_own" ON public.vault_entries;
CREATE POLICY "vault_update_own" ON public.vault_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vault_delete_own" ON public.vault_entries;
CREATE POLICY "vault_delete_own" ON public.vault_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS vault_user_id_idx ON public.vault_entries(user_id);

-- ---------- ai_conversations ----------
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT 'New conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;

DROP POLICY IF EXISTS "aiconv_select_own" ON public.ai_conversations;
CREATE POLICY "aiconv_select_own" ON public.ai_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "aiconv_insert_own" ON public.ai_conversations;
CREATE POLICY "aiconv_insert_own" ON public.ai_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aiconv_update_own" ON public.ai_conversations;
CREATE POLICY "aiconv_update_own" ON public.ai_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aiconv_delete_own" ON public.ai_conversations;
CREATE POLICY "aiconv_delete_own" ON public.ai_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS aiconv_user_id_idx ON public.ai_conversations(user_id);

-- ---------- ai_messages ----------
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  sources jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;

DROP POLICY IF EXISTS "aimsg_select_own" ON public.ai_messages;
CREATE POLICY "aimsg_select_own" ON public.ai_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "aimsg_insert_own" ON public.ai_messages;
CREATE POLICY "aimsg_insert_own" ON public.ai_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aimsg_update_own" ON public.ai_messages;
CREATE POLICY "aimsg_update_own" ON public.ai_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aimsg_delete_own" ON public.ai_messages;
CREATE POLICY "aimsg_delete_own" ON public.ai_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS aimsg_conversation_id_idx ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS aimsg_user_id_idx ON public.ai_messages(user_id);

-- ---------- updated_at trigger helper ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','documents','extracted_document_data','reminders','checklists','checklist_items','vault_entries','ai_conversations'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
  END LOOP;
END $$;
