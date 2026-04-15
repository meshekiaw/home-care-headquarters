-- Drop broken storage policies for client-documents
DROP POLICY IF EXISTS "Owners can read their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their client documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload client documents" ON storage.objects;

-- Recreate with admin access and path-based ownership
CREATE POLICY "Admins can read client documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can upload client documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update client documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete client documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);