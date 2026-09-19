-- 1. Session numbering on courses
ALTER TABLE public.lms_courses ADD COLUMN IF NOT EXISTS session_number integer;
CREATE UNIQUE INDEX IF NOT EXISTS lms_courses_session_number_key
  ON public.lms_courses (session_number) WHERE session_number IS NOT NULL;

-- 2. Admin-only video links
CREATE TABLE public.lms_session_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'youtube',
  video_id text NOT NULL,
  video_url text NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_session_videos TO authenticated;
GRANT ALL ON public.lms_session_videos TO service_role;

ALTER TABLE public.lms_session_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read session videos" ON public.lms_session_videos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert session videos" ON public.lms_session_videos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update session videos" ON public.lms_session_videos
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete session videos" ON public.lms_session_videos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER lms_session_videos_updated_at
  BEFORE UPDATE ON public.lms_session_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER lms_session_videos_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.lms_session_videos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 3. Quiz attempt history (every attempt retained)
CREATE TABLE public.lms_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignment_id uuid NOT NULL REFERENCES public.lms_assignments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  score integer NOT NULL,
  passing_score integer NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lms_quiz_attempts_assignment_idx ON public.lms_quiz_attempts (assignment_id, attempt_number);
CREATE INDEX lms_quiz_attempts_caregiver_idx ON public.lms_quiz_attempts (caregiver_id);

GRANT SELECT ON public.lms_quiz_attempts TO authenticated;
GRANT ALL ON public.lms_quiz_attempts TO service_role;

ALTER TABLE public.lms_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all quiz attempts" ON public.lms_quiz_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers read own quiz attempts" ON public.lms_quiz_attempts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.caregivers c
      WHERE c.id = lms_quiz_attempts.caregiver_id
        AND c.auth_user_id = auth.uid()
    )
  );

-- 4. Caregiver-safe video lookup: returns only the embed id, never the URL
CREATE OR REPLACE FUNCTION public.get_session_video(p_assignment_id uuid)
RETURNS TABLE(provider text, video_id text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT v.provider, v.video_id
  FROM public.lms_assignments a
  JOIN public.caregivers c ON c.id = a.caregiver_id
  JOIN public.lms_session_videos v ON v.course_id = a.course_id
  WHERE a.id = p_assignment_id
    AND (c.auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
END;
$$;

-- 5. Default pass mark of 70 for in-service sessions
ALTER TABLE public.lms_courses ALTER COLUMN passing_score SET DEFAULT 70;