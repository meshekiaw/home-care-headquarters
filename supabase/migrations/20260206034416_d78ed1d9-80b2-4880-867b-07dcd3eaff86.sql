-- Create storage bucket for client documents including nursing forms
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');