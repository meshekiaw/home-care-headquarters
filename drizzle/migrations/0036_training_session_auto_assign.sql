CREATE OR REPLACE FUNCTION public.assign_training_sessions(p_caregiver_id uuid, p_assigned_by text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.lms_assignments (user_id, course_id, caregiver_id, assigned_by)
  SELECT c.user_id, c.id, p_caregiver_id, p_assigned_by
  FROM public.lms_courses c
  WHERE c.session_number IS NOT NULL AND coalesce(c.is_active, true)
  ON CONFLICT (caregiver_id, course_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.assign_training_sessions(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.open_training_session(p_session_number integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cg uuid; v_course uuid; v_owner uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  SELECT id INTO v_cg FROM public.caregivers
   WHERE auth_user_id = auth.uid() AND status = 'active' LIMIT 1;
  IF v_cg IS NULL THEN RAISE EXCEPTION 'not_active_caregiver'; END IF;
  SELECT id, user_id INTO v_course, v_owner FROM public.lms_courses
   WHERE session_number = p_session_number AND coalesce(is_active, true) LIMIT 1;
  IF v_course IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  INSERT INTO public.lms_assignments (user_id, course_id, caregiver_id, assigned_by)
  VALUES (v_owner, v_course, v_cg, 'Shared link')
  ON CONFLICT (caregiver_id, course_id) DO NOTHING;
  SELECT id INTO v_id FROM public.lms_assignments WHERE caregiver_id = v_cg AND course_id = v_course;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.open_training_session(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_training_session(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_sessions_on_caregiver_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.assign_training_sessions(NEW.id, 'Automatic');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assign_sessions_on_caregiver_link ON public.caregivers;
CREATE TRIGGER assign_sessions_on_caregiver_link AFTER INSERT OR UPDATE OF auth_user_id, status ON public.caregivers
FOR EACH ROW EXECUTE FUNCTION public.assign_sessions_on_caregiver_link();

SELECT public.assign_training_sessions(id, 'Automatic') FROM public.caregivers WHERE status = 'active' AND auth_user_id IS NOT NULL;