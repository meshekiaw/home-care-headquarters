ALTER TABLE public.lms_video_progress ADD COLUMN last_position_saved_at timestamptz;

CREATE TABLE public.lms_quiz_drafts (
  assignment_id uuid PRIMARY KEY REFERENCES public.lms_assignments(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lms_quiz_drafts TO authenticated;
GRANT ALL ON public.lms_quiz_drafts TO service_role;
ALTER TABLE public.lms_quiz_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caregivers read own ungraded quiz drafts" ON public.lms_quiz_drafts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.caregivers c WHERE c.id = lms_quiz_drafts.caregiver_id AND c.auth_user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.save_training_quiz_draft(p_assignment_id uuid, p_attempt_count integer, p_question_id uuid DEFAULT NULL, p_answer text DEFAULT NULL)
RETURNS public.lms_quiz_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.lms_assignments; d public.lms_quiz_drafts; n integer;
BEGIN
  SELECT la.* INTO a FROM public.lms_assignments la JOIN public.caregivers c ON c.id=la.caregiver_id
    WHERE la.id=p_assignment_id AND c.auth_user_id=auth.uid() FOR UPDATE OF la;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Training assignment unavailable' USING ERRCODE='42501'; END IF;
  IF a.status='completed' THEN RAISE EXCEPTION 'This training is already completed' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO n FROM public.lms_quiz_attempts WHERE assignment_id=a.id;
  IF p_attempt_count IS NULL OR p_attempt_count<>n THEN RAISE EXCEPTION 'Quiz was already submitted. Reopen it before continuing.' USING ERRCODE='22023'; END IF;
  IF p_question_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lms_quiz_questions q WHERE q.id=p_question_id AND q.course_id=a.course_id
      AND q.options @> jsonb_build_array(p_answer)
  ) THEN RAISE EXCEPTION 'Choose an available quiz answer' USING ERRCODE='22023'; END IF;
  INSERT INTO public.lms_quiz_drafts(assignment_id,caregiver_id,user_id,attempt_count,answers)
    VALUES(a.id,a.caregiver_id,auth.uid(),n,CASE WHEN p_question_id IS NULL THEN '{}'::jsonb ELSE jsonb_build_object(p_question_id::text,p_answer) END)
  ON CONFLICT (assignment_id) DO UPDATE SET
    answers=CASE WHEN p_question_id IS NULL THEN lms_quiz_drafts.answers ELSE lms_quiz_drafts.answers || jsonb_build_object(p_question_id::text,p_answer) END,
    updated_at=now()
  RETURNING * INTO d;
  RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.save_training_quiz_draft(uuid,integer,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_training_quiz_draft(uuid,integer,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_graded_training_draft()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM 1 FROM public.lms_assignments WHERE id=NEW.assignment_id FOR UPDATE;
  DELETE FROM public.lms_quiz_drafts WHERE assignment_id=NEW.assignment_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.clear_graded_training_draft() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER clear_graded_training_draft AFTER INSERT ON public.lms_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.clear_graded_training_draft();

CREATE OR REPLACE FUNCTION public.preserve_training_video_credit()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.watched_seconds:=greatest(OLD.watched_seconds,NEW.watched_seconds);
  NEW.percent_complete:=greatest(OLD.percent_complete,NEW.percent_complete);
  NEW.video_completed_at:=coalesce(OLD.video_completed_at,NEW.video_completed_at);
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_training_video_credit BEFORE UPDATE ON public.lms_video_progress
FOR EACH ROW EXECUTE FUNCTION public.preserve_training_video_credit();

CREATE OR REPLACE FUNCTION public.save_training_video_progress(p_assignment_id uuid,p_position numeric,p_watched numeric,p_duration numeric,p_recorded_at timestamptz)
RETURNS public.lms_video_progress LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.lms_assignments; r public.lms_video_progress; w numeric; pct integer; recorded timestamptz;
BEGIN
  SELECT la.* INTO a FROM public.lms_assignments la JOIN public.caregivers c ON c.id=la.caregiver_id
    WHERE la.id=p_assignment_id AND c.auth_user_id=auth.uid() FOR UPDATE OF la;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Training assignment unavailable' USING ERRCODE='42501'; END IF;
  IF p_duration IS NULL OR p_duration<=0 OR p_duration>86400 OR p_position IS NULL OR p_watched IS NULL
    OR p_position<0 OR p_watched<0 OR p_position>p_duration OR p_watched>p_duration OR p_position>p_watched+1.5
    OR p_recorded_at IS NULL THEN RAISE EXCEPTION 'Invalid video position' USING ERRCODE='22023'; END IF;
  recorded:=least(p_recorded_at,now());
  SELECT * INTO r FROM public.lms_video_progress WHERE assignment_id=a.id;
  w:=greatest(coalesce(r.watched_seconds,0),p_watched);
  pct:=least(100,round(w/p_duration*100)::integer);
  INSERT INTO public.lms_video_progress(user_id,assignment_id,course_id,caregiver_id,watched_seconds,duration_seconds,percent_complete,last_position_seconds,last_position_saved_at,video_completed_at)
    VALUES(auth.uid(),a.id,a.course_id,a.caregiver_id,w,p_duration,pct,p_position,recorded,
      CASE WHEN pct>=95 THEN coalesce(r.video_completed_at,now()) ELSE r.video_completed_at END)
  ON CONFLICT (assignment_id) DO UPDATE SET
    watched_seconds=greatest(lms_video_progress.watched_seconds,EXCLUDED.watched_seconds),
    duration_seconds=EXCLUDED.duration_seconds,
    percent_complete=greatest(lms_video_progress.percent_complete,EXCLUDED.percent_complete),
    last_position_seconds=CASE WHEN lms_video_progress.last_position_saved_at IS NULL OR EXCLUDED.last_position_saved_at>=lms_video_progress.last_position_saved_at THEN EXCLUDED.last_position_seconds ELSE lms_video_progress.last_position_seconds END,
    last_position_saved_at=greatest(lms_video_progress.last_position_saved_at,EXCLUDED.last_position_saved_at),
    video_completed_at=coalesce(lms_video_progress.video_completed_at,EXCLUDED.video_completed_at)
  RETURNING * INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.save_training_video_progress(uuid,numeric,numeric,numeric,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_training_video_progress(uuid,numeric,numeric,numeric,timestamptz) TO authenticated;