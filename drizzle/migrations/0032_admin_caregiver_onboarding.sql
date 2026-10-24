ALTER TABLE public.caregiver_onboarding_admin_notes ADD COLUMN original_seen_date date;
ALTER TABLE public.caregiver_credentials ADD COLUMN caregiver_document_id uuid REFERENCES public.caregiver_documents(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX caregiver_credential_document_unique ON public.caregiver_credentials(caregiver_document_id) WHERE caregiver_document_id IS NOT NULL;
CREATE TABLE public.caregiver_onboarding_admin_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),onboarding_id uuid NOT NULL REFERENCES public.caregiver_onboarding(id) ON DELETE RESTRICT,step_id uuid REFERENCES public.caregiver_onboarding_steps(id) ON DELETE RESTRICT,event_type text NOT NULL,note text,actor_id uuid NOT NULL,actor_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.caregiver_onboarding_admin_events TO authenticated;
GRANT SELECT,INSERT ON public.caregiver_onboarding_admin_events TO service_role;
ALTER TABLE public.caregiver_onboarding_admin_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_admin_events_read ON public.caregiver_onboarding_admin_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'nurse'));
CREATE TRIGGER immutable_onboarding_admin_events BEFORE UPDATE OR DELETE ON public.caregiver_onboarding_admin_events FOR EACH ROW EXECUTE FUNCTION public.reject_onboarding_audit_mutation();
CREATE FUNCTION public.onboarding_actor_name(p_actor uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce(nullif(btrim(raw_user_meta_data->>'display_name'),''),nullif(btrim(raw_user_meta_data->>'full_name'),''),nullif(btrim(raw_user_meta_data->>'name'),''),email,'Account') FROM auth.users WHERE id=p_actor; $$;
REVOKE ALL ON FUNCTION public.onboarding_actor_name(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.onboarding_actor_name(uuid) TO service_role;
CREATE FUNCTION public.admin_caregiver_onboarding(p_caregiver_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.caregiver_onboarding; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Admin access required.'; END IF;
 SELECT * INTO o FROM public.caregiver_onboarding WHERE caregiver_id=p_caregiver_id AND archived_at IS NULL;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('id',o.id,'steps',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'step_number',s.step_number,'step_key',s.step_key,'step_label',s.step_label,'status',s.status,'submitted_at',s.submitted_at,'approved_at',s.approved_at,'approved_by_name',CASE WHEN s.approved_by IS NOT NULL THEN public.onboarding_actor_name(s.approved_by) WHEN s.step_number=12 AND s.status='approved' THEN 'Automatic orientation completion' END,'sent_back_reason',s.sent_back_reason,'certificate_name',s.certificate_name,'no_certificate',s.no_certificate,'admin_note',n.admin_note,'original_seen_date',n.original_seen_date) ORDER BY s.step_number) FROM public.caregiver_onboarding_steps s LEFT JOIN public.caregiver_onboarding_admin_notes n ON n.step_id=s.id WHERE s.onboarding_id=o.id),'[]'::jsonb),'history',coalesce((SELECT jsonb_agg(row_to_json(h) ORDER BY h.changed_at DESC) FROM (
 SELECT x.id,x.step_id,x.old_status,x.new_status,x.changed_at,coalesce(public.onboarding_actor_name(x.changed_by),'Automatic / system') AS actor_name,x.note,'status_change'::text AS event_type FROM public.caregiver_onboarding_step_history x JOIN public.caregiver_onboarding_steps s ON s.id=x.step_id WHERE s.onboarding_id=o.id
 UNION ALL SELECT e.id,e.step_id,NULL,NULL,e.created_at,e.actor_name,e.note,e.event_type FROM public.caregiver_onboarding_admin_events e WHERE e.onboarding_id=o.id) h),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_caregiver_onboarding(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_caregiver_onboarding(uuid) TO authenticated;
CREATE FUNCTION public.guard_onboarding_credential_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.caregiver_document_id IS DISTINCT FROM OLD.caregiver_document_id OR NEW.caregiver_id IS DISTINCT FROM OLD.caregiver_id THEN
  IF NEW.caregiver_document_id IS NOT NULL THEN
   IF auth.uid() IS NOT NULL AND (NOT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nurse')) THEN RAISE EXCEPTION 'Admin access required for document linking.'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.caregiver_documents d JOIN public.caregiver_onboarding_steps s ON s.id=d.step_id WHERE d.id=NEW.caregiver_document_id AND d.caregiver_id=NEW.caregiver_id AND d.archived_at IS NULL AND s.step_key='certificate') THEN RAISE EXCEPTION 'Choose this caregiver’s certificate document.'; END IF;
  ELSIF TG_OP='UPDATE' AND OLD.caregiver_document_id IS NOT NULL AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required for document linking.'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_onboarding_credential_link() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_onboarding_credential_link BEFORE INSERT OR UPDATE ON public.caregiver_credentials FOR EACH ROW EXECUTE FUNCTION public.guard_onboarding_credential_link();
CREATE FUNCTION public.review_caregiver_onboarding(p_step_id uuid,p_action text,p_note text DEFAULT NULL,p_original_seen_date date DEFAULT NULL,p_credential jsonb DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.caregiver_onboarding_steps; c public.caregivers; doc uuid; next_status text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Admin access required.'; END IF;
 SELECT * INTO s FROM public.caregiver_onboarding_steps WHERE id=p_step_id FOR UPDATE;
 IF NOT FOUND OR s.step_number NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'Only caregiver steps can be reviewed here.'; END IF;
 SELECT cg.* INTO c FROM public.caregivers cg JOIN public.caregiver_onboarding o ON o.caregiver_id=cg.id WHERE o.id=s.onboarding_id AND o.archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is unavailable.'; END IF;
 IF p_action IS NULL OR p_action NOT IN('approve','send_back','paper_approve') THEN RAISE EXCEPTION 'Choose a review action.'; END IF;
 IF p_action IN('send_back','paper_approve') AND nullif(btrim(p_note),'') IS NULL THEN RAISE EXCEPTION 'Enter the reason or received-paperwork note.'; END IF;
 IF length(coalesce(p_note,''))>2000 THEN RAISE EXCEPTION 'Keep the note under 2000 characters.'; END IF;
 IF p_original_seen_date IS NOT NULL AND (s.step_key NOT IN('photo_id','social_security_card') OR p_original_seen_date>(now() AT TIME ZONE 'America/Chicago')::date) THEN RAISE EXCEPTION 'Enter a valid original-seen date.'; END IF;
 IF p_action='approve' AND s.step_number IN(4,5,6) AND NOT EXISTS(SELECT 1 FROM public.caregiver_documents WHERE step_id=s.id AND archived_at IS NULL) THEN RAISE EXCEPTION 'Upload a file or use the paper approval option.'; END IF;
 IF p_credential IS NOT NULL THEN
  IF s.step_key<>'certificate' OR p_action<>'approve' OR jsonb_typeof(p_credential)<>'object' OR nullif(btrim(p_credential->>'name'),'') IS NULL OR length(p_credential->>'name')>150 OR length(coalesce(p_credential->>'number',''))>150 THEN RAISE EXCEPTION 'Enter valid certificate details.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_credential) k WHERE k NOT IN('name','number','issue_date','expiry_date','document_id')) THEN RAISE EXCEPTION 'Enter certificate details only.'; END IF;
  doc:=(p_credential->>'document_id')::uuid;
  IF doc IS NULL OR NOT EXISTS(SELECT 1 FROM public.caregiver_documents WHERE id=doc AND step_id=s.id AND caregiver_id=c.id AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose this step’s uploaded certificate.'; END IF;
  IF nullif(p_credential->>'issue_date','')::date>nullif(p_credential->>'expiry_date','')::date THEN RAISE EXCEPTION 'Expiration cannot be before issue date.'; END IF;
  INSERT INTO public.caregiver_credentials(caregiver_id,user_id,credential_type,credential_name,credential_number,issue_date,expiry_date,caregiver_document_id) VALUES(c.id,auth.uid(),'certification',btrim(p_credential->>'name'),nullif(btrim(p_credential->>'number'),''),nullif(p_credential->>'issue_date','')::date,nullif(p_credential->>'expiry_date','')::date,doc)
  ON CONFLICT(caregiver_document_id) WHERE caregiver_document_id IS NOT NULL DO UPDATE SET credential_name=EXCLUDED.credential_name,credential_number=EXCLUDED.credential_number,issue_date=EXCLUDED.issue_date,expiry_date=EXCLUDED.expiry_date,updated_at=now();
 END IF;
 next_status:=CASE WHEN p_action='send_back' THEN 'sent_back' ELSE 'approved' END;
 UPDATE public.caregiver_onboarding_steps SET status=next_status,approved_at=CASE WHEN next_status='approved' THEN now() END,approved_by=CASE WHEN next_status='approved' THEN auth.uid() END,sent_back_at=CASE WHEN next_status='sent_back' THEN now() ELSE sent_back_at END,sent_back_reason=CASE WHEN next_status='sent_back' THEN btrim(p_note) END,no_certificate=CASE WHEN next_status='approved' THEN false ELSE no_certificate END,updated_at=now() WHERE id=s.id;
 INSERT INTO public.caregiver_onboarding_admin_notes(step_id,admin_note,original_seen_date,updated_by) VALUES(s.id,CASE WHEN p_action='send_back' THEN '' ELSE coalesce(btrim(p_note),'') END,p_original_seen_date,auth.uid()) ON CONFLICT(step_id) DO UPDATE SET admin_note=CASE WHEN p_action='send_back' THEN caregiver_onboarding_admin_notes.admin_note ELSE EXCLUDED.admin_note END,original_seen_date=EXCLUDED.original_seen_date,updated_by=EXCLUDED.updated_by,updated_at=now();
 INSERT INTO public.caregiver_onboarding_admin_events(onboarding_id,step_id,event_type,note,actor_id,actor_name) VALUES(s.onboarding_id,s.id,p_action,concat_ws(E'\n',nullif(btrim(p_note),''),CASE WHEN p_original_seen_date IS NOT NULL THEN 'Original seen in person: '||p_original_seen_date::text END,CASE WHEN p_credential IS NOT NULL THEN 'Certificate added to credentials' END),auth.uid(),public.onboarding_actor_name(auth.uid()));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.review_caregiver_onboarding(uuid,text,text,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_caregiver_onboarding(uuid,text,text,date,jsonb) TO authenticated;
CREATE FUNCTION public.save_office_onboarding(p_step_id uuid,p_check_date date DEFAULT NULL,p_tmu_expiration_date date DEFAULT NULL,p_note text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.caregiver_onboarding_steps; c_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Admin access required.'; END IF;
 SELECT * INTO s FROM public.caregiver_onboarding_steps WHERE id=p_step_id FOR UPDATE;
 IF NOT FOUND OR s.step_number NOT BETWEEN 7 AND 11 THEN RAISE EXCEPTION 'Choose an office step.'; END IF;
 SELECT caregiver_id INTO c_id FROM public.caregiver_onboarding WHERE id=s.onboarding_id AND archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is unavailable.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.caregiver_documents WHERE step_id=s.id AND archived_at IS NULL) THEN RAISE EXCEPTION 'Upload the result or document first.'; END IF;
 IF s.step_number<>7 AND p_check_date IS NULL THEN RAISE EXCEPTION 'Enter the check date.'; END IF;
 IF s.step_key='tmu' AND (p_tmu_expiration_date IS NULL OR p_tmu_expiration_date<p_check_date) THEN RAISE EXCEPTION 'Enter a TMU expiration on or after its date.'; END IF;
 IF length(coalesce(p_note,''))>2000 THEN RAISE EXCEPTION 'Keep the note under 2000 characters.'; END IF;
 IF s.step_key='background_check' THEN UPDATE public.caregivers SET background_check_date=p_check_date WHERE id=c_id;
 ELSIF s.step_key='adult_maltreatment_check' THEN UPDATE public.caregivers SET adult_maltreatment_check_date=p_check_date WHERE id=c_id;
 ELSIF s.step_key='child_maltreatment_check' THEN UPDATE public.caregivers SET child_maltreatment_check_date=p_check_date WHERE id=c_id;
 ELSIF s.step_key='tmu' THEN UPDATE public.caregivers SET tmu_date=p_check_date,tmu_expiration_date=p_tmu_expiration_date WHERE id=c_id;
 END IF;
 UPDATE public.caregiver_onboarding_steps SET status='approved',approved_at=now(),approved_by=auth.uid(),sent_back_reason=NULL,updated_at=now() WHERE id=s.id;
 INSERT INTO public.caregiver_onboarding_admin_notes(step_id,admin_note,updated_by) VALUES(s.id,coalesce(btrim(p_note),''),auth.uid()) ON CONFLICT(step_id) DO UPDATE SET admin_note=EXCLUDED.admin_note,updated_by=EXCLUDED.updated_by,updated_at=now();
 INSERT INTO public.caregiver_onboarding_admin_events(onboarding_id,step_id,event_type,note,actor_id,actor_name) VALUES(s.onboarding_id,s.id,'office_saved',concat_ws(E'\n',nullif(btrim(p_note),''),CASE WHEN p_check_date IS NOT NULL THEN 'Check date: '||p_check_date::text END,CASE WHEN s.step_key='tmu' THEN 'TMU expiration: '||p_tmu_expiration_date::text END),auth.uid(),public.onboarding_actor_name(auth.uid()));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.save_office_onboarding(uuid,date,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_office_onboarding(uuid,date,date,text) TO authenticated;
CREATE FUNCTION public.set_caregiver_onboarding_required(p_caregiver_id uuid,p_required boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Admin access required.'; END IF;
 IF p_required IS NULL THEN RAISE EXCEPTION 'Choose Yes or No.'; END IF;
 SELECT id INTO o_id FROM public.caregiver_onboarding WHERE caregiver_id=p_caregiver_id AND archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is unavailable.'; END IF;
 UPDATE public.caregivers SET onboarding_required=p_required WHERE id=p_caregiver_id AND onboarding_required IS DISTINCT FROM p_required;
 IF FOUND THEN INSERT INTO public.caregiver_onboarding_admin_events(onboarding_id,event_type,note,actor_id,actor_name) VALUES(o_id,'requirement_changed',CASE WHEN p_required THEN 'Onboarding required: Yes' ELSE 'Onboarding required: No' END,auth.uid(),public.onboarding_actor_name(auth.uid())); END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_caregiver_onboarding_required(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_caregiver_onboarding_required(uuid,boolean) TO authenticated;
CREATE FUNCTION public.replace_caregiver_document(p_actor_id uuid,p_old_document_id uuid,p_new_document_id uuid,p_object_path text,p_file_name text,p_mime_type text,p_file_size bigint,p_note text) RETURNS public.caregiver_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.caregiver_documents; s public.caregiver_onboarding_steps; result public.caregiver_documents;
BEGIN
 IF p_actor_id IS NULL OR NOT public.has_role(p_actor_id,'admin') OR public.has_role(p_actor_id,'nurse') THEN RAISE EXCEPTION 'Admin access required.'; END IF;
 IF nullif(btrim(p_note),'') IS NULL OR length(p_note)>2000 THEN RAISE EXCEPTION 'Enter a replacement note.'; END IF;
 SELECT st.* INTO s FROM public.caregiver_onboarding_steps st JOIN public.caregiver_documents dc ON dc.step_id=st.id WHERE dc.id=p_old_document_id FOR UPDATE OF st;
 SELECT * INTO d FROM public.caregiver_documents WHERE id=p_old_document_id AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND OR s.step_number NOT BETWEEN 7 AND 11 THEN RAISE EXCEPTION 'Choose an active office document.'; END IF;
 result:=public.register_caregiver_document(p_actor_id,d.caregiver_id,d.step_id,p_new_document_id,p_object_path,p_file_name,p_mime_type,p_file_size);
 UPDATE public.caregiver_documents SET archived_at=now() WHERE id=d.id;
 INSERT INTO public.caregiver_onboarding_admin_events(onboarding_id,step_id,event_type,note,actor_id,actor_name) VALUES(s.onboarding_id,s.id,'file_replaced',d.file_name||' replaced by '||p_file_name||E'\n'||btrim(p_note),p_actor_id,public.onboarding_actor_name(p_actor_id));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.replace_caregiver_document(uuid,uuid,uuid,text,text,text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_caregiver_document(uuid,uuid,uuid,text,text,text,bigint,text) TO service_role;