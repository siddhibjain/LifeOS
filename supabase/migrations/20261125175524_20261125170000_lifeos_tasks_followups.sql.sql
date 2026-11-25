/*
# LifeOS — Tasks, Task Dependencies, Follow-ups, and suggested_actions column

1. Overview
This migration adds three new tables to support the Action Engine, LifeGraph, and FollowUp Assistant features:
- `tasks`: Actionable items created from documents or manually. Four statuses: not_started, in_progress, waiting, completed.
- `task_dependencies`: Directed edges between tasks (prerequisite → dependent). Used by LifeGraph.
- `follow_ups`: Tracks pending responses and unfinished processes with submission/expected response dates.

Additionally adds a `suggested_actions` jsonb column to `extracted_document_data` so the AI extraction edge function can store suggested tasks alongside the extracted document data.

2. New tables and columns
- `tasks`:
  - id (uuid PK)
  - user_id (uuid, FK auth.users, DEFAULT auth.uid())
  - title (text, not null)
  - description (text)
  - status (text: not_started | in_progress | waiting | completed, default not_started)
  - priority (text: low | medium | high, default medium)
  - deadline (date)
  - document_id (uuid, FK documents, nullable — source document link)
  - source_evidence (text — excerpt from the document that prompted the action)
  - reminder_enabled (boolean, default false — whether reminders are set for this task)
  - ai_suggested (boolean, default false — whether this task was suggested by the AI extraction)
  - approved (boolean, default false — whether the user approved an AI-suggested task)
  - created_at, updated_at (timestamptz)
- `task_dependencies`:
  - id (uuid PK)
  - user_id (uuid, FK auth.users, DEFAULT auth.uid())
  - task_id (uuid, FK tasks ON DELETE CASCADE — the dependent task)
  - prerequisite_task_id (uuid, FK tasks ON DELETE CASCADE — the prerequisite)
  - created_at (timestamptz)
  - Unique constraint on (task_id, prerequisite_task_id) to prevent duplicate edges
  - Check constraint: task_id != prerequisite_task_id (no self-dependencies)
- `follow_ups`:
  - id (uuid PK)
  - user_id (uuid, FK auth.users, DEFAULT auth.uid())
  - title (text, not null)
  - description (text)
  - document_id (uuid, FK documents, nullable)
  - task_id (uuid, FK tasks, nullable)
  - submission_date (date — when the request was submitted)
  - expected_response_date (date — when a response is expected)
  - status (text: pending | responded | overdue, default pending)
  - contact_info (text — who/where the request was sent)
  - follow_up_message (text — a drafted polite follow-up message)
  - created_at, updated_at (timestamptz)
- `extracted_document_data`: new column `suggested_actions` (jsonb, nullable)

3. Security
- RLS enabled on tasks, task_dependencies, follow_ups.
- Owner column user_id defaults to auth.uid() on all three tables.
- 4 separate policies (select/insert/update/delete) per table, scoped TO authenticated with auth.uid() = user_id.
- Grants: SELECT, INSERT, UPDATE, DELETE to authenticated on all three tables.
- ALTER TABLE on extracted_document_data to add the column (additive only, no data loss).

4. Notes
- Cascading deletes: deleting a task removes its dependency edges; deleting a document sets task.document_id to NULL (tasks survive), follow_ups.document_id to NULL.
- Indexes on user_id, status, deadline, document_id for tasks; user_id and task_id for dependencies; user_id and status for follow_ups.
- updated_at trigger added for tasks and follow_ups.
*/

-- ---------- tasks ----------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started',
  priority text NOT NULL DEFAULT 'medium',
  deadline date,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  source_evidence text,
  reminder_enabled boolean DEFAULT false,
  ai_suggested boolean DEFAULT false,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON public.tasks(deadline);
CREATE INDEX IF NOT EXISTS tasks_document_id_idx ON public.tasks(document_id);

-- ---------- task_dependencies ----------
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  prerequisite_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT task_deps_unique UNIQUE (task_id, prerequisite_task_id),
  CONSTRAINT task_deps_no_self CHECK (task_id <> prerequisite_task_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_dependencies TO authenticated;

DROP POLICY IF EXISTS "task_deps_select_own" ON public.task_dependencies;
CREATE POLICY "task_deps_select_own" ON public.task_dependencies
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "task_deps_insert_own" ON public.task_dependencies;
CREATE POLICY "task_deps_insert_own" ON public.task_dependencies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "task_deps_delete_own" ON public.task_dependencies;
CREATE POLICY "task_deps_delete_own" ON public.task_dependencies
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS task_deps_user_id_idx ON public.task_dependencies(user_id);
CREATE INDEX IF NOT EXISTS task_deps_task_id_idx ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS task_deps_prereq_id_idx ON public.task_dependencies(prerequisite_task_id);

-- ---------- follow_ups ----------
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  submission_date date,
  expected_response_date date,
  status text NOT NULL DEFAULT 'pending',
  contact_info text,
  follow_up_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;

DROP POLICY IF EXISTS "follow_ups_select_own" ON public.follow_ups;
CREATE POLICY "follow_ups_select_own" ON public.follow_ups
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "follow_ups_insert_own" ON public.follow_ups;
CREATE POLICY "follow_ups_insert_own" ON public.follow_ups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "follow_ups_update_own" ON public.follow_ups;
CREATE POLICY "follow_ups_update_own" ON public.follow_ups
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "follow_ups_delete_own" ON public.follow_ups;
CREATE POLICY "follow_ups_delete_own" ON public.follow_ups
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS follow_ups_user_id_idx ON public.follow_ups(user_id);
CREATE INDEX IF NOT EXISTS follow_ups_status_idx ON public.follow_ups(status);
CREATE INDEX IF NOT EXISTS follow_ups_document_id_idx ON public.follow_ups(document_id);

-- ---------- Add suggested_actions column to extracted_document_data ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'extracted_document_data' AND column_name = 'suggested_actions'
  ) THEN
    ALTER TABLE public.extracted_document_data ADD COLUMN suggested_actions jsonb;
  END IF;
END $$;

-- ---------- updated_at triggers for new tables ----------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['tasks','follow_ups'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
  END LOOP;
END $$;
