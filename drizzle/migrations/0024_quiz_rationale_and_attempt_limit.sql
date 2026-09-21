ALTER TABLE public.lms_quiz_questions ADD COLUMN IF NOT EXISTS rationale text;
ALTER TABLE public.lms_courses ADD COLUMN IF NOT EXISTS max_attempts integer;