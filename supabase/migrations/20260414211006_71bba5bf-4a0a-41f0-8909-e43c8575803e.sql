
-- Recreate the view with SECURITY INVOKER to fix the security definer warning
CREATE OR REPLACE VIEW public.orientation_quizzes_public
WITH (security_invoker = true) AS
SELECT id, user_id, section_number, question_text, options, points, sort_order, created_at
FROM public.orientation_quizzes;
