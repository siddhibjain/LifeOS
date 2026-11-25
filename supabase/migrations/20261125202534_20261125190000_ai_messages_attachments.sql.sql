/*
# Add attachments column to ai_messages

1. Overview
Adds an `attachments` jsonb column to the `ai_messages` table so users can
attach images and files (PDFs) to their Ask AI chat messages. The Gemini
edge function reads these attachments and passes them as inlineData to the
model alongside the text question.

2. Changes
- `ai_messages`: new column `attachments` (jsonb, nullable)
  - Stores an array of objects: { name, type, data (base64) }
  - Null or empty array means no attachments (existing rows unaffected)

3. Security
- No RLS policy changes needed — the table already has owner-scoped
  SELECT/INSERT/UPDATE/DELETE policies scoped to auth.uid() = user_id.
- The new column is automatically covered by the existing table-level
  grants to `authenticated`.

4. Notes
- Additive only: no data loss, no type changes, no drops.
- Idempotent: uses IF NOT EXISTS check before adding the column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_messages'
      AND column_name = 'attachments'
  ) THEN
    ALTER TABLE public.ai_messages ADD COLUMN attachments jsonb;
  END IF;
END $$;
