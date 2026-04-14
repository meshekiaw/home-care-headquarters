
-- Create a public view that excludes correct_answer
CREATE OR REPLACE VIEW public.orientation_quizzes_public AS
SELECT id, user_id, section_number, question_text, options, points, sort_order, created_at
FROM public.orientation_quizzes;

-- Drop the blanket caregiver SELECT policy
DROP POLICY IF EXISTS "Caregivers can view orientation quizzes" ON public.orientation_quizzes;

-- Ensure admins can still manage quizzes (owner-scoped policy should already exist, but ensure it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orientation_quizzes' AND policyname = 'Users can view their own orientation quizzes'
  ) THEN
    CREATE POLICY "Users can view their own orientation quizzes"
    ON public.orientation_quizzes
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Grant SELECT on the view to authenticated users so caregivers can read quiz questions (without correct_answer)
GRANT SELECT ON public.orientation_quizzes_public TO authenticated;
GRANT SELECT ON public.orientation_quizzes_public TO anon;
