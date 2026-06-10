DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;

DROP POLICY IF EXISTS "Auth users can upload orientation-audio" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete orientation-audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete orientation audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update orientation audio" ON storage.objects;

CREATE POLICY "Admins can upload orientation-audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'orientation-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orientation-audio"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'orientation-audio' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'orientation-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orientation-audio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'orientation-audio' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own orientation quizzes" ON public.orientation_quizzes;
DROP POLICY IF EXISTS "Users can create their own orientation quizzes" ON public.orientation_quizzes;
DROP POLICY IF EXISTS "Users can update their own orientation quizzes" ON public.orientation_quizzes;
DROP POLICY IF EXISTS "Users can delete their own orientation quizzes" ON public.orientation_quizzes;

GRANT SELECT ON public.orientation_quizzes_public TO authenticated, anon;