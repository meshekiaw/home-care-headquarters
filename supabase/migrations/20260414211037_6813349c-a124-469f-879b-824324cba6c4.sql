
-- Remove the blanket SELECT policy we just added (it defeats the purpose)
DROP POLICY IF EXISTS "Authenticated users can read quizzes" ON public.orientation_quizzes;

-- Revert view to SECURITY DEFINER - this is intentional because:
-- 1. Caregivers should NOT have direct SELECT on orientation_quizzes (which has correct_answer)
-- 2. The view excludes correct_answer and runs as the view owner (who has access)
CREATE OR REPLACE VIEW public.orientation_quizzes_public
WITH (security_invoker = false) AS
SELECT id, user_id, section_number, question_text, options, points, sort_order, created_at
FROM public.orientation_quizzes;
