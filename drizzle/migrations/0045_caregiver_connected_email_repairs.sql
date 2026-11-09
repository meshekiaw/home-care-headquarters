CREATE TABLE public.caregiver_email_repairs (
 request_id uuid PRIMARY KEY, actor_id uuid NOT NULL, caregiver_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('update_email','switch_account')),
 old_account_id uuid NOT NULL, target_account_id uuid NOT NULL,
 old_email text NOT NULL, target_email text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','succeeded','failed')),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '2 minutes', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.caregiver_email_repairs TO service_role;
ALTER TABLE public.caregiver_email_repairs ENABLE ROW LEVEL SECURITY;
CREATE INDEX caregiver_email_repairs_pending ON public.caregiver_email_repairs(caregiver_id,state);
CREATE OR REPLACE FUNCTION public.caregiver_access_snapshot(p_actor_id uuid,p_caregiver_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.caregivers%ROWTYPE; u auth.users%ROWTYPE; linked auth.users%ROWTYPE; v_email text; v_state text; v_problem text; v_other text; v_matches integer; v_log jsonb; mismatch boolean:=false; protected boolean:=false; can_update boolean:=false; can_switch boolean:=false;
BEGIN
 IF p_actor_id IS NULL OR NOT public.has_role(p_actor_id,'admin') THEN RAISE EXCEPTION 'Only admins can manage caregiver sign-in access'; END IF;
 SELECT * INTO c FROM public.caregivers WHERE id=p_caregiver_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Caregiver not found'; END IF;
 SELECT * INTO linked FROM auth.users WHERE id=c.auth_user_id;
 v_email:=lower(regexp_replace(coalesce(c.email,''),'\s','','g'));
 mismatch:=c.auth_user_id IS NOT NULL AND linked.id IS NOT NULL AND lower(regexp_replace(coalesce(linked.email,''),'\s','','g')) IS DISTINCT FROM v_email;
 SELECT count(*) INTO v_matches FROM auth.users WHERE lower(regexp_replace(email,'\s','','g'))=v_email;
 SELECT * INTO u FROM auth.users WHERE lower(regexp_replace(email,'\s','','g'))=v_email ORDER BY id LIMIT 1;
 v_state:=CASE WHEN v_email='' THEN 'no_email' WHEN v_matches=0 THEN 'no_account' WHEN c.auth_user_id=u.id AND public.has_role(u.id,'caregiver') THEN 'ready' ELSE 'not_set_up' END;
 IF v_matches>1 THEN v_problem:='More than one account uses this email. Access needs office review.'; END IF;
 IF u.id IS NOT NULL AND public.has_role(u.id,'nurse') THEN v_problem:='This email belongs to a nurse account. Use a different email for her caregiver access.'; v_state:='not_set_up'; END IF;
 SELECT first_name || ' ' || last_name INTO v_other FROM public.caregivers WHERE id<>c.id AND ((u.id IS NOT NULL AND auth_user_id=u.id) OR lower(regexp_replace(email,'\s','','g'))=v_email) ORDER BY id LIMIT 1;
 IF v_other IS NOT NULL THEN v_problem:='This email is already connected to ' || v_other || '. Use a different email for her caregiver access.'; END IF;
 IF c.auth_user_id IS NOT NULL AND c.auth_user_id IS DISTINCT FROM u.id AND NOT mismatch THEN v_problem:='This record is connected to a different sign-in account. Access needs office review.'; END IF;
 IF mismatch THEN
   protected:=public.has_role(linked.id,'admin') OR public.has_role(linked.id,'nurse');
   can_update:=NOT protected AND v_email<>'' AND v_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' AND v_matches=0 AND v_other IS NULL;
   can_switch:=NOT protected AND v_matches=1 AND NOT public.has_role(u.id,'admin') AND NOT public.has_role(u.id,'nurse') AND v_other IS NULL;
   IF protected THEN v_problem:='The connected account has an admin or nurse role. It cannot be changed here.';
   ELSIF v_matches=0 AND v_other IS NULL THEN v_problem:=NULL;
   ELSIF v_matches=1 AND v_other IS NULL THEN v_problem:='The profile email is already used by account ' || u.email || '. No email change has been made.';
   END IF;
   IF u.id IS NOT NULL AND public.has_role(u.id,'admin') THEN can_switch:=false; v_problem:='The profile email belongs to an admin account. It cannot be connected here.'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.caregiver_email_repairs r WHERE r.caregiver_id=c.id AND state='pending' AND expires_at>now()) THEN can_update:=false; can_switch:=false; v_problem:='An access update is in progress. Refresh shortly before trying again.'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'actor_email',e.actor_email,'email',e.email,'caregiver_name',e.caregiver_name,'event',e.event,'detail',e.detail,'created_at',e.created_at) ORDER BY e.created_at DESC,e.id),'[]'::jsonb) INTO v_log FROM public.caregiver_access_events e WHERE e.caregiver_id=c.id;
 RETURN jsonb_build_object('caregiver_id',c.id,'caregiver_name',c.first_name||' '||c.last_name,'email',v_email,'account_id',u.id,'account_email',u.email,'connected_account_id',linked.id,'connected_account_email',linked.email,'email_mismatch',mismatch,'can_update_email',can_update,'can_switch_account',can_switch,'state',v_state,'problem',v_problem,'history',v_log);
END $$;
CREATE OR REPLACE FUNCTION public.admin_caregiver_access(p_caregiver_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can view caregiver sign-in access'; END IF;
 IF p_caregiver_id IS NOT NULL THEN RETURN public.caregiver_access_snapshot(auth.uid(),p_caregiver_id)-'account_id'-'connected_account_id'; END IF;
 SELECT coalesce(jsonb_agg((public.caregiver_access_snapshot(auth.uid(),c.id)-'account_id'-'connected_account_id'-'history') ORDER BY c.id),'[]'::jsonb) INTO v_result FROM public.caregivers c;
 RETURN v_result;
END $$;
CREATE FUNCTION public.guard_pending_caregiver_email_repair() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid; v_caregiver uuid;
BEGIN
 IF TG_TABLE_NAME='user_roles' THEN
  v_user:=CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  IF EXISTS(SELECT 1 FROM public.caregiver_email_repairs WHERE state='pending' AND expires_at>now() AND v_user IN(old_account_id,target_account_id)) THEN RAISE EXCEPTION 'An account email repair is pending. Retry the role change shortly.'; END IF;
 ELSE
  v_caregiver:=NEW.id;
  IF (NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR NEW.email IS DISTINCT FROM OLD.email) AND EXISTS(SELECT 1 FROM public.caregiver_email_repairs WHERE state='pending' AND expires_at>now() AND (caregiver_id=v_caregiver OR NEW.auth_user_id IN(old_account_id,target_account_id) OR lower(regexp_replace(coalesce(NEW.email,''),'\s','','g'))=target_email)) THEN RAISE EXCEPTION 'An account email repair is pending. Retry the profile change shortly.'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_pending_caregiver_email_repair() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_email_repair_roles BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_pending_caregiver_email_repair();
CREATE TRIGGER guard_email_repair_profile BEFORE UPDATE OF auth_user_id,email ON public.caregivers FOR EACH ROW EXECUTE FUNCTION public.guard_pending_caregiver_email_repair();
CREATE FUNCTION public.prepare_caregiver_email_repair(p_actor_id uuid,p_caregiver_id uuid,p_email text,p_name text,p_old_email text,p_action text,p_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; old_id uuid; target_id uuid;
BEGIN
 IF p_actor_id IS NULL OR NOT public.has_role(p_actor_id,'admin') THEN RAISE EXCEPTION 'Only admins can manage caregiver sign-in access'; END IF;
 IF p_action NOT IN('update_email','switch_account') THEN RAISE EXCEPTION 'Confirm an email repair action'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_email,0));
 LOCK TABLE public.caregivers,public.user_roles IN SHARE ROW EXCLUSIVE MODE;
 PERFORM 1 FROM auth.users WHERE id IN(SELECT auth_user_id FROM public.caregivers WHERE id=p_caregiver_id) OR lower(regexp_replace(email,'\s','','g'))=p_email ORDER BY id FOR UPDATE;
 s:=public.caregiver_access_snapshot(p_actor_id,p_caregiver_id);
 IF s->>'email' IS DISTINCT FROM p_email OR s->>'caregiver_name' IS DISTINCT FROM p_name OR s->>'connected_account_email' IS DISTINCT FROM p_old_email OR NOT coalesce((s->>'email_mismatch')::boolean,false) THEN RAISE EXCEPTION 'The profile or connected account changed. Refresh and confirm again.'; END IF;
 IF (p_action='update_email' AND NOT coalesce((s->>'can_update_email')::boolean,false)) OR (p_action='switch_account' AND NOT coalesce((s->>'can_switch_account')::boolean,false)) THEN RAISE EXCEPTION '%',coalesce(s->>'problem','This email repair is not available. Refresh access.'); END IF;
 old_id:=(s->>'connected_account_id')::uuid;
 target_id:=CASE WHEN p_action='update_email' THEN old_id ELSE (s->>'account_id')::uuid END;
 IF p_action='switch_account' AND (EXISTS(SELECT 1 FROM public.lms_video_progress WHERE user_id=target_id AND caregiver_id IS DISTINCT FROM p_caregiver_id) OR EXISTS(SELECT 1 FROM public.lms_quiz_drafts WHERE user_id=target_id AND caregiver_id IS DISTINCT FROM p_caregiver_id) OR EXISTS(SELECT 1 FROM public.lms_quiz_attempts WHERE user_id=target_id AND caregiver_id IS DISTINCT FROM p_caregiver_id)) THEN RAISE EXCEPTION 'That account has training records for a different caregiver. Access needs office review.'; END IF;
 INSERT INTO public.caregiver_email_repairs(request_id,actor_id,caregiver_id,action,old_account_id,target_account_id,old_email,target_email) VALUES(p_request_id,p_actor_id,p_caregiver_id,p_action,old_id,target_id,p_old_email,p_email);
 PERFORM public.record_caregiver_access_event(p_actor_id,p_caregiver_id,p_email,p_request_id,'requested',CASE WHEN p_action='update_email' THEN 'Update connected sign-in email from ' ELSE 'Switch connected sign-in account from ' END || p_old_email || ' to ' || p_email || '.');
 RETURN jsonb_build_object('old_account_id',old_id,'target_account_id',target_id,'old_email',p_old_email,'target_email',p_email);
END $$;
REVOKE ALL ON FUNCTION public.prepare_caregiver_email_repair(uuid,uuid,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_caregiver_email_repair(uuid,uuid,text,text,text,text,uuid) TO service_role;
CREATE FUNCTION public.finish_caregiver_email_repair(p_actor_id uuid,p_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.caregiver_email_repairs%ROWTYPE; c public.caregivers%ROWTYPE; u auth.users%ROWTYPE; v_videos integer:=0; v_drafts integer:=0; v_assignments integer; v_completed integer; v_attempts integer; v_detail text;
BEGIN
 IF p_actor_id IS NULL OR NOT public.has_role(p_actor_id,'admin') THEN RAISE EXCEPTION 'Only admins can manage caregiver sign-in access'; END IF;
 SELECT * INTO r FROM public.caregiver_email_repairs WHERE request_id=p_request_id AND actor_id=p_actor_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Email repair confirmation unavailable'; END IF;
 IF r.state='succeeded' THEN RETURN jsonb_build_object('access',public.caregiver_access_snapshot(p_actor_id,r.caregiver_id)-'account_id'-'connected_account_id'); END IF;
 IF r.state<>'pending' OR r.expires_at<=now() THEN RAISE EXCEPTION 'Email repair confirmation expired. Review access before trying again.'; END IF;
 LOCK TABLE public.caregivers,public.user_roles IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO c FROM public.caregivers WHERE id=r.caregiver_id FOR UPDATE;
 PERFORM 1 FROM auth.users WHERE id IN(r.old_account_id,r.target_account_id) ORDER BY id FOR UPDATE;
 SELECT * INTO u FROM auth.users WHERE id=r.target_account_id;
 IF c.auth_user_id IS DISTINCT FROM r.old_account_id OR lower(regexp_replace(c.email,'\s','','g')) IS DISTINCT FROM r.target_email THEN RAISE EXCEPTION 'Profile changed during repair. Review access.'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id IN(r.old_account_id,r.target_account_id) AND role IN('admin','nurse')) THEN RAISE EXCEPTION 'Admin and nurse accounts cannot be changed'; END IF;
 IF lower(regexp_replace(u.email,'\s','','g')) IS DISTINCT FROM r.target_email OR u.email_confirmed_at IS NULL OR (SELECT count(*) FROM auth.users WHERE lower(regexp_replace(email,'\s','','g'))=r.target_email)<>1 THEN RAISE EXCEPTION 'The confirmed account email could not be verified'; END IF;
 IF EXISTS(SELECT 1 FROM public.caregivers WHERE id<>c.id AND (auth_user_id IN(r.old_account_id,r.target_account_id) OR lower(regexp_replace(email,'\s','','g'))=r.target_email)) THEN RAISE EXCEPTION 'This email is connected to another caregiver'; END IF;
 UPDATE public.caregiver_email_repairs SET state='succeeded' WHERE request_id=r.request_id;
 IF r.action='switch_account' THEN
  PERFORM 1 FROM public.lms_assignments WHERE caregiver_id=c.id ORDER BY id FOR UPDATE;
  UPDATE public.lms_video_progress SET user_id=r.target_account_id WHERE caregiver_id=c.id AND user_id=r.old_account_id;
  GET DIAGNOSTICS v_videos=ROW_COUNT;
  UPDATE public.lms_quiz_drafts SET user_id=r.target_account_id WHERE caregiver_id=c.id AND user_id=r.old_account_id;
  GET DIAGNOSTICS v_drafts=ROW_COUNT;
  UPDATE public.caregivers SET auth_user_id=r.target_account_id WHERE id=c.id;
 END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(r.target_account_id,'caregiver') ON CONFLICT(user_id,role) DO NOTHING;
 SELECT count(*),count(*) FILTER(WHERE status='completed') INTO v_assignments,v_completed FROM public.lms_assignments WHERE caregiver_id=c.id;
 SELECT count(*) INTO v_attempts FROM public.lms_quiz_attempts WHERE caregiver_id=c.id;
 v_detail:=CASE WHEN r.action='update_email' THEN 'Sign-in email updated from '||r.old_email||' to '||r.target_email||'; existing account and connection kept. No training records moved.' ELSE 'Connected account switched from '||r.old_email||' to '||r.target_email||'. Moved '||v_videos||' saved video positions and '||v_drafts||' unfinished quiz drafts.' END || ' Retained '||v_assignments||' assignments, '||v_completed||' completions and '||v_attempts||' quiz attempts unchanged. No email sent; scores, completion dates and hours unchanged.';
 PERFORM public.record_caregiver_access_event(p_actor_id,c.id,r.target_email,r.request_id,'succeeded',v_detail);
 RETURN jsonb_build_object('access',public.caregiver_access_snapshot(p_actor_id,c.id)-'account_id'-'connected_account_id','summary',v_detail,'moved',jsonb_build_object('video_positions',v_videos,'quiz_drafts',v_drafts),'retained',jsonb_build_object('assignments',v_assignments,'completions',v_completed,'quiz_attempts',v_attempts));
END $$;
REVOKE ALL ON FUNCTION public.finish_caregiver_email_repair(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_caregiver_email_repair(uuid,uuid) TO service_role;
CREATE FUNCTION public.fail_caregiver_email_repair(p_actor_id uuid,p_request_id uuid,p_detail text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.caregiver_email_repairs%ROWTYPE;
BEGIN
 IF p_actor_id IS NULL OR NOT public.has_role(p_actor_id,'admin') THEN RAISE EXCEPTION 'Only admins can manage caregiver sign-in access'; END IF;
 SELECT * INTO r FROM public.caregiver_email_repairs WHERE request_id=p_request_id AND actor_id=p_actor_id FOR UPDATE;
 IF NOT FOUND OR r.state<>'pending' THEN RETURN false; END IF;
 UPDATE public.caregiver_email_repairs SET state='failed' WHERE request_id=p_request_id;
 PERFORM public.record_caregiver_access_event(p_actor_id,r.caregiver_id,r.target_email,r.request_id,'failed',left(p_detail,1000));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fail_caregiver_email_repair(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fail_caregiver_email_repair(uuid,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.lookup_training_caregiver(p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_email text:=lower(regexp_replace(p_email,'\s','','g')); c public.caregivers%ROWTYPE; v_user_id uuid;
BEGIN
 IF (SELECT count(*) FROM public.caregivers WHERE status='active' AND lower(regexp_replace(email,'\s','','g'))=v_email)<>1 THEN RETURN NULL; END IF;
 SELECT * INTO c FROM public.caregivers WHERE status='active' AND lower(regexp_replace(email,'\s','','g'))=v_email;
 SELECT id INTO v_user_id FROM auth.users WHERE lower(regexp_replace(email,'\s','','g'))=v_email ORDER BY id LIMIT 1;
 IF c.auth_user_id IS NOT NULL AND c.auth_user_id IS DISTINCT FROM v_user_id THEN RETURN jsonb_build_object('office_update',true); END IF;
 IF (SELECT count(*) FROM auth.users WHERE lower(regexp_replace(email,'\s','','g'))=v_email)>1 THEN RAISE EXCEPTION 'Training login needs office review'; END IF;
 RETURN jsonb_build_object('caregiver_id',c.id,'user_id',v_user_id);
END $$;