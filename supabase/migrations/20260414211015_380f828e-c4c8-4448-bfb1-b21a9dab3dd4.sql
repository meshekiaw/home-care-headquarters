
-- Allow all authenticated users to SELECT from orientation_quizzes so the SECURITY INVOKER view works
-- The view itself excludes the correct_answer column
CREATE POLICY "Authenticated users can read quizzes"
ON public.orientation_quizzes
FOR SELECT
TO authenticated
USING (true);
