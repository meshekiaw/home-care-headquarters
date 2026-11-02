CREATE TABLE public.caregiver_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  caregiver_id uuid NOT NULL,
  caregiver_name text NOT NULL,
  actor_id uuid NOT NULL,
  actor_email text NOT NULL,
  email text NOT NULL,
  event text NOT NULL CHECK (event IN ('requested','account_created','succeeded','failed')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.caregiver_access_events TO authenticated;
GRANT ALL ON public.caregiver_access_events TO service_role;
ALTER TABLE public.caregiver_access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read caregiver access history" ON public.caregiver_access_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX caregiver_access_events_history ON public.caregiver_access_events(caregiver_id, created_at DESC);
CREATE FUNCTION public.guard_caregiver_access_history() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RAISE EXCEPTION 'Sign-in access history is append-only'; END; $$;
REVOKE ALL ON FUNCTION public.guard_caregiver_access_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER caregiver_access_history_immutable BEFORE UPDATE OR DELETE ON public.caregiver_access_events FOR EACH ROW EXECUTE FUNCTION public.guard_caregiver_access_history();

CREATE FUNCTION public.caregiver_access_snapshot(p_actor_id uuid, p_caregiver_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.caregivers%ROWTYPE; u auth.users%ROWTYPE; v_email text; v_state text; v_problem text; v_other text; v_matches integer; v_log jsonb;
BEGIN
  IF p_actor_id IS NULL OR NOT public.has_role(p_actor_id, 'admin') THEN RAISE EXCEPTION 'Only admins can manage caregiver sign-in access'; END IF;
  SELECT * INTO c FROM public.caregivers WHERE id = p_caregiver_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caregiver not found'; END IF;
  v_email := lower(regexp_replace(coalesce(c.email,''), '\s', '', 'g'));
  IF v_email = '' THEN v_state := 'no_email';
  ELSE
    SELECT count(*) INTO v_matches FROM auth.users WHERE lower(regexp_replace(email, '\s', '', 'g')) = v_email;
    SELECT * INTO u FROM auth.users WHERE lower(regexp_replace(email, '\s', '', 'g')) = v_email ORDER BY id LIMIT 1;
    v_state := CASE WHEN v_matches = 0 THEN 'no_account' WHEN c.auth_user_id = u.id AND public.has_role(u.id,'caregiver') THEN 'ready' ELSE 'not_set_up' END;
    IF v_matches > 1 THEN v_problem := 'More than one account uses this email. Access needs office review.'; END IF;
    IF u.id IS NOT NULL AND public.has_role(u.id,'nurse') THEN v_problem := 'This email belongs to a nurse account. Use a different email for her caregiver access.'; v_state := 'not_set_up'; END IF;
    SELECT first_name || ' ' || last_name INTO v_other FROM public.caregivers WHERE id <> c.id AND ((u.id IS NOT NULL AND auth_user_id = u.id) OR lower(regexp_replace(email, '\s', '', 'g')) = v_email) ORDER BY id LIMIT 1;
    IF v_other IS NOT NULL THEN v_problem := 'This email is already connected to ' || v_other || '. Use a different email for her caregiver access.'; END IF;
    IF c.auth_user_id IS NOT NULL AND c.auth_user_id IS DISTINCT FROM u.id THEN v_problem := 'This record is connected to a different sign-in account. Access needs office review.'; END IF;
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'actor_email',e.actor_email,'email',e.email,'caregiver_name',e.caregiver_name,'event',e.event,'detail',e.detail,'created_at',e.created_at) ORDER BY e.created_at DESC,e.id), '[]'::jsonb) INTO v_log FROM public.caregiver_access_events e WHERE e.caregiver_id = c.id;
  RETURN jsonb_build_object('caregiver_id',c.id,'caregiver_name',c.first_name || ' ' || c.last_name,'email',v_email,'account_id',u.id,'account_email',u.email,'state',v_state,'problem',v_problem,'history',v_log);
END; $$;
REVOKE ALL ON FUNCTION public.caregiver_access_snapshot(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caregiver_access_snapshot(uuid,uuid) TO service_role;

CREATE FUNCTION public.admin_caregiver_access(p_caregiver_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can view caregiver sign-in access'; END IF;
  IF p_caregiver_id IS NOT NULL THEN RETURN public.caregiver_access_snapshot(auth.uid(),p_caregiver_id) - 'account_id'; END IF;
  SELECT coalesce(jsonb_agg((public.caregiver_access_snapshot(auth.uid(),c.id) - 'account_id' - 'history') ORDER BY c.id),'[]'::jsonb) INTO v_result FROM public.caregivers c;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.admin_caregiver_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_caregiver_access(uuid) TO authenticated;

CREATE FUNCTION public.record_caregiver_access_event(p_actor_id uuid,p_caregiver_id uuid,p_email text,p_request_id uuid,p_event text,p_detail text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_email text; v_name text;
BEGIN
  IF p_actor_id IS NULL OR NOT public.has_role(p_actor_id,'admin') THEN RAISE EXCEPTION 'Only admins can manage caregiver sign-in access'; END IF;
  SELECT email INTO v_actor_email FROM auth.users WHERE id=p_actor_id;
  SELECT first_name || ' ' || last_name INTO v_name FROM public.caregivers WHERE id=p_caregiver_id;
  IF v_name IS NULL OR v_actor_email IS NULL THEN RAISE EXCEPTION 'Access actor or caregiver is unavailable'; END IF;
  INSERT INTO public.caregiver_access_events(request_id,caregiver_id,caregiver_name,actor_id,actor_email,email,event,detail) VALUES(p_request_id,p_caregiver_id,v_name,p_actor_id,v_actor_email,p_email,p_event,p_detail);
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.record_caregiver_access_event(uuid,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_caregiver_access_event(uuid,uuid,text,uuid,text,text) TO service_role;

CREATE FUNCTION public.finish_caregiver_access(p_actor_id uuid,p_caregiver_id uuid,p_email text,p_account_id uuid,p_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_snapshot jsonb; v_added integer;
BEGIN
  IF p_actor_id IS NULL OR NOT public.has_role(p_actor_id,'admin') THEN RAISE EXCEPTION 'Only admins can manage caregiver sign-in access'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_email,0));
  PERFORM 1 FROM public.caregivers WHERE id=p_caregiver_id FOR UPDATE;
  PERFORM 1 FROM auth.users WHERE id=p_account_id FOR UPDATE;
  LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;
  v_snapshot := public.caregiver_access_snapshot(p_actor_id,p_caregiver_id);
  IF v_snapshot->>'email' IS DISTINCT FROM p_email OR v_snapshot->>'account_id' IS DISTINCT FROM p_account_id::text THEN RAISE EXCEPTION 'The profile email or account changed. Review access and confirm again.'; END IF;
  IF v_snapshot->>'problem' IS NOT NULL THEN RAISE EXCEPTION '%', v_snapshot->>'problem'; END IF;
  IF (SELECT count(DISTINCT session_number) FROM public.lms_courses WHERE session_number BETWEEN 1 AND 12 AND coalesce(is_active,true)) <> 12 THEN RAISE EXCEPTION 'All 12 training sessions must be available before giving access'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.caregiver_access_events WHERE request_id=p_request_id AND caregiver_id=p_caregiver_id AND actor_id=p_actor_id AND email=p_email AND event='requested') THEN RAISE EXCEPTION 'Access confirmation was not recorded'; END IF;
  IF EXISTS(SELECT 1 FROM public.caregiver_access_events WHERE request_id=p_request_id AND event='succeeded') THEN RETURN v_snapshot - 'account_id'; END IF;
  INSERT INTO public.user_roles(user_id,role) VALUES(p_account_id,'caregiver') ON CONFLICT(user_id,role) DO NOTHING;
  UPDATE public.caregivers SET auth_user_id=p_account_id WHERE id=p_caregiver_id AND auth_user_id IS NULL;
  v_added := public.assign_training_sessions(p_caregiver_id, 'Admin access');
  PERFORM public.record_caregiver_access_event(p_actor_id,p_caregiver_id,p_email,p_request_id,'succeeded','Caregiver role and account connected; all 12 training sessions assigned.');
  RETURN public.caregiver_access_snapshot(p_actor_id,p_caregiver_id) - 'account_id';
END; $$;
REVOKE ALL ON FUNCTION public.finish_caregiver_access(uuid,uuid,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_caregiver_access(uuid,uuid,text,uuid,uuid) TO service_role;