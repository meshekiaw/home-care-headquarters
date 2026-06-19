-- Restrict lms_quiz_questions to admins only to prevent any path where
-- non-admin users could read the 'correct_answer' column.
DROP POLICY IF EXISTS "Users can view their own quiz questions" ON public.lms_quiz_questions;
DROP POLICY IF EXISTS "Users can create their own quiz questions" ON public.lms_quiz_questions;
DROP POLICY IF EXISTS "Users can update their own quiz questions" ON public.lms_quiz_questions;
DROP POLICY IF EXISTS "Users can delete their own quiz questions" ON public.lms_quiz_questions;