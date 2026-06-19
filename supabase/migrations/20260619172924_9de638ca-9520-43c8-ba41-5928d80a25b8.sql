
DROP POLICY IF EXISTS "Admins manage lms certificates" ON storage.objects;
CREATE POLICY "Admins manage lms certificates"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'lms-certificates' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'lms-certificates' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Caregivers read own certificates" ON storage.objects;
CREATE POLICY "Caregivers read own certificates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lms-certificates'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.caregivers WHERE auth_user_id = auth.uid()
    )
  );
