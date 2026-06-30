
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can read their own client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents' AND owner = auth.uid());

CREATE POLICY "Users can upload their own client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents' AND owner = auth.uid());

CREATE POLICY "Users can update their own client documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents' AND owner = auth.uid())
WITH CHECK (bucket_id = 'client-documents' AND owner = auth.uid());

CREATE POLICY "Users can delete their own client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents' AND owner = auth.uid());
