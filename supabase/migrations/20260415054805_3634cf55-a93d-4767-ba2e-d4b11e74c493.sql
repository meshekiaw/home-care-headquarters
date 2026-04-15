DROP VIEW IF EXISTS public.orientation_quizzes_public;

CREATE VIEW public.orientation_quizzes_public
WITH (security_invoker = true)
AS
SELECT id,
    user_id,
    section_number,
    question_text,
    options,
    points,
    sort_order,
    created_at
FROM orientation_quizzes;