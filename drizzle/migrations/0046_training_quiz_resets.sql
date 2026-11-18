CREATE TABLE public.lms_quiz_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.lms_assignments(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  reset_by uuid NOT NULL,
  reset_by_name text NOT NULL,
  attempts_before integer NOT NULL CHECK (attempts_before >= 0),
  failed_attempts_before integer NOT NULL CHECK (failed_attempts_before >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lms_quiz_resets_assignment_idx ON public.lms_quiz_resets(assignment_id, created_at DESC);
CREATE INDEX lms_quiz_resets_caregiver_idx ON public.lms_quiz_resets(caregiver_id, created_at DESC);

GRANT SELECT ON public.lms_quiz_resets TO authenticated;
GRANT ALL ON public.lms_quiz_resets TO service_role;
ALTER TABLE public.lms_quiz_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read quiz reset log" ON public.lms_quiz_resets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE FUNCTION public.reject_quiz_reset_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'The quiz reset log cannot be changed.'; END $$;
CREATE TRIGGER lms_quiz_resets_append_only BEFORE UPDATE ON public.lms_quiz_resets
  FOR EACH ROW EXECUTE FUNCTION public.reject_quiz_reset_mutation();

-- Attempts count from the most recent reset; earlier attempts stay in history.
CREATE FUNCTION public.training_quiz_attempt_state(p_assignment_id uuid)
RETURNS TABLE(last_reset_at timestamptz, attempts_since_reset integer, failed_since_reset integer, total_attempts integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (SELECT max(created_at) AS at FROM public.lms_quiz_resets WHERE assignment_id = p_assignment_id)
  SELECT r.at,
    (count(q.id) FILTER (WHERE r.at IS NULL OR q.attempted_at > r.at))::integer,
    (count(q.id) FILTER (WHERE NOT q.passed AND (r.at IS NULL OR q.attempted_at > r.at)))::integer,
    count(q.id)::integer
  FROM r LEFT JOIN public.lms_quiz_attempts q ON q.assignment_id = p_assignment_id
  GROUP BY r.at
$$;
REVOKE ALL ON FUNCTION public.training_quiz_attempt_state(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.training_quiz_attempt_state(uuid) TO service_role;

CREATE FUNCTION public.training_quiz_needs_reset(p_status text, p_max_attempts integer, p_attempts_since integer, p_failed_since integer)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(p_status, '') <> 'completed'
    AND (coalesce(p_failed_since, 0) >= 2 OR (p_max_attempts IS NOT NULL AND coalesce(p_attempts_since, 0) >= p_max_attempts))
$$;

CREATE FUNCTION public.admin_quiz_reset_status(p_caregiver_id uuid DEFAULT NULL)
RETURNS TABLE(assignment_id uuid, caregiver_id uuid, course_id uuid, session_number integer, session_title text,
  assignment_status text, max_attempts integer, total_attempts integer, attempts_since_reset integer,
  failed_since_reset integer, last_reset_at timestamptz, needs_reset boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can view quiz resets.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.id, a.caregiver_id, a.course_id, c.session_number, c.title, a.status, c.max_attempts,
    s.total_attempts, s.attempts_since_reset, s.failed_since_reset, s.last_reset_at,
    public.training_quiz_needs_reset(a.status, c.max_attempts, s.attempts_since_reset, s.failed_since_reset)
  FROM public.lms_assignments a
  JOIN public.lms_courses c ON c.id = a.course_id
  CROSS JOIN LATERAL public.training_quiz_attempt_state(a.id) s
  WHERE (p_caregiver_id IS NULL OR a.caregiver_id = p_caregiver_id)
    AND (s.total_attempts > 0 OR s.last_reset_at IS NOT NULL)
    AND (p_caregiver_id IS NOT NULL OR public.training_quiz_needs_reset(a.status, c.max_attempts, s.attempts_since_reset, s.failed_since_reset))
  ORDER BY c.session_number NULLS LAST, c.title;
END $$;
REVOKE ALL ON FUNCTION public.admin_quiz_reset_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_quiz_reset_status(uuid) TO authenticated, service_role;

CREATE FUNCTION public.reset_training_quiz(p_assignment_id uuid)
RETURNS public.lms_quiz_resets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_a record;
  v_s record;
  v_row public.lms_quiz_resets;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can reset quizzes.' USING ERRCODE = '42501';
  END IF;
  SELECT a.id, a.caregiver_id, a.course_id, a.status, c.max_attempts INTO v_a
    FROM public.lms_assignments a JOIN public.lms_courses c ON c.id = a.course_id
    WHERE a.id = p_assignment_id FOR UPDATE OF a;
  IF NOT FOUND THEN RAISE EXCEPTION 'This training session was not found.' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_s FROM public.training_quiz_attempt_state(p_assignment_id);
  IF NOT public.training_quiz_needs_reset(v_a.status, v_a.max_attempts, v_s.attempts_since_reset, v_s.failed_since_reset) THEN
    RAISE EXCEPTION 'This quiz doesn''t need a reset. Refresh to see her latest attempts.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.lms_quiz_resets(assignment_id, caregiver_id, course_id, reset_by, reset_by_name, attempts_before, failed_attempts_before, created_at)
  VALUES (v_a.id, v_a.caregiver_id, v_a.course_id, v_actor, coalesce(public.onboarding_actor_name(v_actor), 'Admin'),
    v_s.attempts_since_reset, v_s.failed_since_reset, clock_timestamp())
  RETURNING * INTO v_row;
  -- Retake starts blank; video progress, attempts, scores and completion stay untouched.
  DELETE FROM public.lms_quiz_drafts WHERE assignment_id = p_assignment_id;
  RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.reset_training_quiz(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_training_quiz(uuid) TO authenticated, service_role;