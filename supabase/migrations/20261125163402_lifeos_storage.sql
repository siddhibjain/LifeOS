/*
# LifeOS — private document storage bucket

1. Storage
- Creates a private bucket `lifeos-documents` (not public).
- Documents are stored under `{user_id}/{filename}` paths.

2. Security
- Storage object policies scope SELECT/INSERT/UPDATE/DELETE to the owning user
  by matching the first path segment to auth.uid().
- Only authenticated users can access their own objects.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('lifeos-documents', 'lifeos-documents', false)
ON CONFLICT (id) DO NOTHING;

-- SELECT (download / signed-url read)
DROP POLICY IF EXISTS "docs_storage_select_own" ON storage.objects;
CREATE POLICY "docs_storage_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lifeos-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- INSERT (upload)
DROP POLICY IF EXISTS "docs_storage_insert_own" ON storage.objects;
CREATE POLICY "docs_storage_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lifeos-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- UPDATE (replace / rename)
DROP POLICY IF EXISTS "docs_storage_update_own" ON storage.objects;
CREATE POLICY "docs_storage_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lifeos-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'lifeos-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- DELETE
DROP POLICY IF EXISTS "docs_storage_delete_own" ON storage.objects;
CREATE POLICY "docs_storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lifeos-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
