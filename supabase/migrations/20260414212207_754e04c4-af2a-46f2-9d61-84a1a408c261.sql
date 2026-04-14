
-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "Auth users can read from client-documents" ON storage.objects;

-- Drop other broad policies on this bucket if they exist
DROP POLICY IF EXISTS "Auth users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update in client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete from client-documents" ON storage.objects;

-- SELECT: only if the file_url matches a client_documents row owned by this user
CREATE POLICY "Owners can read their client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.client_documents cd
    WHERE cd.user_id = auth.uid()
      AND cd.file_url = name
  )
);

-- INSERT: user can upload to paths they will own
CREATE POLICY "Owners can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
);

-- UPDATE: only if they own a matching record
CREATE POLICY "Owners can update their client documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.client_documents cd
    WHERE cd.user_id = auth.uid()
      AND cd.file_url = name
  )
);

-- DELETE: only if they own a matching record
CREATE POLICY "Owners can delete their client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.client_documents cd
    WHERE cd.user_id = auth.uid()
      AND cd.file_url = name
  )
);
