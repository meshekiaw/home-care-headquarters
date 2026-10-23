ALTER TABLE public.caregivers
  ADD COLUMN emergency_contact_name text,
  ADD COLUMN emergency_contact_relationship text,
  ADD COLUMN emergency_contact_phone text,
  ADD COLUMN child_maltreatment_check_date date,
  ADD COLUMN adult_maltreatment_check_date date,
  ADD COLUMN child_maltreatment_expiration_date date GENERATED ALWAYS AS ((child_maltreatment_check_date + interval '2 years')::date) STORED,
  ADD COLUMN adult_maltreatment_expiration_date date GENERATED ALWAYS AS ((adult_maltreatment_check_date + interval '2 years')::date) STORED,
  ADD COLUMN onboarding_required boolean NOT NULL DEFAULT false;
UPDATE public.caregivers SET child_maltreatment_check_date = maltreatment_check_date, adult_maltreatment_check_date = maltreatment_expiration_date;
ALTER TABLE public.caregivers ALTER COLUMN onboarding_required SET DEFAULT true;
COMMENT ON COLUMN public.caregivers.maltreatment_check_date IS 'DEPRECATED: replaced by child_maltreatment_check_date; synchronized for older deployed clients.';
COMMENT ON COLUMN public.caregivers.maltreatment_expiration_date IS 'DEPRECATED: historically an adult check date, replaced by adult_maltreatment_check_date; never an expiration.';

CREATE FUNCTION public.guard_caregiver_onboarding_fields() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.onboarding_required := true;
    NEW.child_maltreatment_check_date := COALESCE(NEW.child_maltreatment_check_date, NEW.maltreatment_check_date);
    NEW.adult_maltreatment_check_date := COALESCE(NEW.adult_maltreatment_check_date, NEW.maltreatment_expiration_date);
  ELSE
    IF NEW.onboarding_required IS DISTINCT FROM OLD.onboarding_required AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only an administrator can change the onboarding requirement.';
    END IF;
    IF NEW.child_maltreatment_check_date IS NOT DISTINCT FROM OLD.child_maltreatment_check_date AND NEW.maltreatment_check_date IS DISTINCT FROM OLD.maltreatment_check_date THEN NEW.child_maltreatment_check_date := NEW.maltreatment_check_date; END IF;
    IF NEW.adult_maltreatment_check_date IS NOT DISTINCT FROM OLD.adult_maltreatment_check_date AND NEW.maltreatment_expiration_date IS DISTINCT FROM OLD.maltreatment_expiration_date THEN NEW.adult_maltreatment_check_date := NEW.maltreatment_expiration_date; END IF;
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND (NEW.child_maltreatment_check_date IS DISTINCT FROM OLD.child_maltreatment_check_date OR NEW.adult_maltreatment_check_date IS DISTINCT FROM OLD.adult_maltreatment_check_date) THEN
      RAISE EXCEPTION 'Only an administrator can change maltreatment check dates.';
    END IF;
  END IF;
  NEW.maltreatment_check_date := NEW.child_maltreatment_check_date;
  NEW.maltreatment_expiration_date := NEW.adult_maltreatment_check_date;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_caregiver_onboarding_fields BEFORE INSERT OR UPDATE ON public.caregivers FOR EACH ROW EXECUTE FUNCTION public.guard_caregiver_onboarding_fields();

CREATE FUNCTION public.is_onboarding_caregiver(p_caregiver_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.has_role(auth.uid(), 'caregiver') AND NOT public.has_role(auth.uid(), 'nurse') AND EXISTS(SELECT 1 FROM public.caregivers WHERE id=p_caregiver_id AND auth_user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_onboarding_caregiver(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_onboarding_caregiver(uuid) TO authenticated, service_role;

CREATE TABLE public.caregiver_onboarding (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), caregiver_id uuid NOT NULL UNIQUE REFERENCES public.caregivers(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz
);
GRANT SELECT ON public.caregiver_onboarding TO authenticated;
GRANT ALL ON public.caregiver_onboarding TO service_role;
ALTER TABLE public.caregiver_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_admin_read ON public.caregiver_onboarding FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'nurse'));
CREATE POLICY onboarding_self_read ON public.caregiver_onboarding FOR SELECT TO authenticated USING (public.is_onboarding_caregiver(caregiver_id));

CREATE TABLE public.caregiver_onboarding_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), onboarding_id uuid NOT NULL REFERENCES public.caregiver_onboarding(id) ON DELETE RESTRICT,
 step_number integer NOT NULL CHECK (step_number BETWEEN 1 AND 12), step_key text NOT NULL,
 step_label text NOT NULL, status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','submitted','approved','sent_back','not_applicable')),
 submitted_at timestamptz, approved_at timestamptz, approved_by uuid, sent_back_at timestamptz, sent_back_reason text,
 no_certificate boolean NOT NULL DEFAULT false, file_paths text[] NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(onboarding_id,step_number), UNIQUE(onboarding_id,step_key)
);
GRANT SELECT ON public.caregiver_onboarding_steps TO authenticated;
GRANT ALL ON public.caregiver_onboarding_steps TO service_role;
ALTER TABLE public.caregiver_onboarding_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_steps_admin_read ON public.caregiver_onboarding_steps FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'nurse'));
CREATE POLICY onboarding_steps_self_read ON public.caregiver_onboarding_steps FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.caregiver_onboarding o WHERE o.id=onboarding_id AND public.is_onboarding_caregiver(o.caregiver_id)));

CREATE TABLE public.caregiver_onboarding_admin_notes (
 step_id uuid PRIMARY KEY REFERENCES public.caregiver_onboarding_steps(id) ON DELETE RESTRICT, admin_note text NOT NULL DEFAULT '', updated_by uuid, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.caregiver_onboarding_admin_notes TO authenticated;
GRANT ALL ON public.caregiver_onboarding_admin_notes TO service_role;
ALTER TABLE public.caregiver_onboarding_admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_notes_admin_read ON public.caregiver_onboarding_admin_notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'nurse'));

CREATE TABLE public.caregiver_onboarding_step_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), step_id uuid NOT NULL REFERENCES public.caregiver_onboarding_steps(id) ON DELETE RESTRICT,
 old_status text, new_status text NOT NULL, changed_by uuid, changed_at timestamptz NOT NULL DEFAULT now(), note text
);
GRANT SELECT ON public.caregiver_onboarding_step_history TO authenticated;
GRANT SELECT, INSERT ON public.caregiver_onboarding_step_history TO service_role;
ALTER TABLE public.caregiver_onboarding_step_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_history_admin_read ON public.caregiver_onboarding_step_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'nurse'));
CREATE POLICY onboarding_history_self_read ON public.caregiver_onboarding_step_history FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.caregiver_onboarding_steps s JOIN public.caregiver_onboarding o ON o.id=s.onboarding_id WHERE s.id=step_id AND public.is_onboarding_caregiver(o.caregiver_id)));

CREATE TABLE public.caregiver_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), caregiver_id uuid NOT NULL REFERENCES public.caregivers(id) ON DELETE RESTRICT,
 step_id uuid NOT NULL REFERENCES public.caregiver_onboarding_steps(id) ON DELETE RESTRICT,
 object_path text NOT NULL UNIQUE, file_name text NOT NULL, mime_type text NOT NULL, file_size bigint NOT NULL,
 uploaded_by uuid NOT NULL, uploaded_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz,
 CHECK(file_size>0)
);
GRANT SELECT ON public.caregiver_documents TO authenticated;
GRANT ALL ON public.caregiver_documents TO service_role;
ALTER TABLE public.caregiver_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY caregiver_documents_admin_read ON public.caregiver_documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'nurse'));
CREATE POLICY caregiver_documents_self_read ON public.caregiver_documents FOR SELECT TO authenticated USING (public.is_onboarding_caregiver(caregiver_id) AND uploaded_by=auth.uid());

CREATE TABLE public.caregiver_document_view_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES public.caregiver_documents(id) ON DELETE RESTRICT,
 admin_id uuid NOT NULL, caregiver_id uuid NOT NULL REFERENCES public.caregivers(id) ON DELETE RESTRICT,
 file_name text NOT NULL, object_path text NOT NULL, viewed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.caregiver_document_view_log TO authenticated;
GRANT SELECT, INSERT ON public.caregiver_document_view_log TO service_role;
ALTER TABLE public.caregiver_document_view_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY caregiver_document_view_log_admin_read ON public.caregiver_document_view_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'nurse'));

CREATE TABLE public.caregiver_document_access_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES public.caregiver_documents(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT (now()+interval '60 seconds'), used_at timestamptz
);
GRANT ALL ON public.caregiver_document_access_tickets TO service_role;
ALTER TABLE public.caregiver_document_access_tickets ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.caregiver_document_access_tickets IS 'Service-only, single-use, 60-second user-bound file tickets. Never Storage signed URLs.';

CREATE FUNCTION public.reject_onboarding_audit_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Audit history cannot be changed or deleted.'; END $$;
CREATE TRIGGER immutable_onboarding_step_history BEFORE UPDATE OR DELETE ON public.caregiver_onboarding_step_history FOR EACH ROW EXECUTE FUNCTION public.reject_onboarding_audit_mutation();
CREATE TRIGGER immutable_caregiver_document_views BEFORE UPDATE OR DELETE ON public.caregiver_document_view_log FOR EACH ROW EXECUTE FUNCTION public.reject_onboarding_audit_mutation();
CREATE FUNCTION public.record_onboarding_status_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO public.caregiver_onboarding_step_history(step_id,old_status,new_status,changed_by,note) VALUES(NEW.id,NULL,NEW.status,auth.uid(),'Initialized');
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
  INSERT INTO public.caregiver_onboarding_step_history(step_id,old_status,new_status,changed_by,note) VALUES(NEW.id,OLD.status,NEW.status,auth.uid(),CASE WHEN NEW.status='sent_back' THEN NEW.sent_back_reason ELSE NULL END);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER onboarding_status_history AFTER INSERT OR UPDATE ON public.caregiver_onboarding_steps FOR EACH ROW EXECUTE FUNCTION public.record_onboarding_status_history();

CREATE FUNCTION public.initialize_caregiver_onboarding(p_caregiver_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_required boolean; v_orientation timestamptz;
BEGIN
 SELECT onboarding_required INTO v_required FROM public.caregivers WHERE id=p_caregiver_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Caregiver not found.'; END IF;
 INSERT INTO public.caregiver_onboarding(caregiver_id) VALUES(p_caregiver_id) ON CONFLICT(caregiver_id) DO NOTHING;
 SELECT id INTO v_id FROM public.caregiver_onboarding WHERE caregiver_id=p_caregiver_id;
 SELECT max(completed_at) INTO v_orientation FROM public.orientation_progress WHERE caregiver_id=p_caregiver_id;
 INSERT INTO public.caregiver_onboarding_steps(onboarding_id,step_number,step_key,step_label,status,approved_at)
 SELECT v_id, n, k, label, CASE WHEN NOT v_required THEN 'not_applicable' WHEN n=12 AND v_orientation IS NOT NULL THEN 'approved' ELSE 'not_started' END, CASE WHEN n=12 AND v_required THEN v_orientation ELSE NULL END
 FROM (VALUES
 (1,'hiring_application','Hiring application'),(2,'personal_information','Personal and emergency contact information'),(3,'policy_signoffs','Policy and handbook sign-offs'),
 (4,'photo_id','Photo ID'),(5,'social_security_card','Social Security card'),(6,'certificate','Certificate (optional)'),(7,'tax_payroll_forms','Tax and payroll forms'),
 (8,'background_check','Background check'),(9,'adult_maltreatment_check','Adult maltreatment check'),(10,'child_maltreatment_check','Child maltreatment check'),(11,'tmu','TMU'),(12,'orientation','Orientation')) AS steps(n,k,label)
 ON CONFLICT(onboarding_id,step_number) DO NOTHING;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.initialize_caregiver_onboarding(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_caregiver_onboarding(uuid) TO service_role;
CREATE FUNCTION public.initialize_new_caregiver_onboarding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.initialize_caregiver_onboarding(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER initialize_new_caregiver_onboarding AFTER INSERT ON public.caregivers FOR EACH ROW EXECUTE FUNCTION public.initialize_new_caregiver_onboarding();
-- Backfill records introduced by this additive schema change; all existing caregivers are exempt.
SELECT public.initialize_caregiver_onboarding(id) FROM public.caregivers;

CREATE FUNCTION public.sync_onboarding_orientation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.completed_at IS NOT NULL THEN
  UPDATE public.caregiver_onboarding_steps s SET status='approved', approved_at=NEW.completed_at, approved_by=NULL, updated_at=now()
  FROM public.caregiver_onboarding o JOIN public.caregivers c ON c.id=o.caregiver_id
  WHERE s.onboarding_id=o.id AND o.caregiver_id=NEW.caregiver_id AND c.onboarding_required AND s.step_key='orientation' AND s.status<>'approved';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_onboarding_orientation AFTER INSERT OR UPDATE OF completed_at ON public.orientation_progress FOR EACH ROW EXECUTE FUNCTION public.sync_onboarding_orientation();

CREATE FUNCTION public.change_caregiver_onboarding_step(p_step_id uuid,p_status text,p_sent_back_reason text DEFAULT NULL,p_admin_note text DEFAULT NULL,p_no_certificate boolean DEFAULT false) RETURNS public.caregiver_onboarding_steps LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_step public.caregiver_onboarding_steps; v_caregiver public.caregivers; v_admin boolean;
BEGIN
 IF auth.uid() IS NULL OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Sign in with an authorized account.'; END IF;
 SELECT * INTO v_step FROM public.caregiver_onboarding_steps WHERE id=p_step_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Step not found.'; END IF;
 SELECT c.* INTO v_caregiver FROM public.caregivers c JOIN public.caregiver_onboarding o ON o.caregiver_id=c.id WHERE o.id=v_step.onboarding_id AND o.archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is archived.'; END IF;
 v_admin:=public.has_role(auth.uid(),'admin');
 IF NOT v_admin AND NOT public.is_onboarding_caregiver(v_caregiver.id) THEN RAISE EXCEPTION 'Access denied.'; END IF;
 IF NOT v_caregiver.onboarding_required THEN RAISE EXCEPTION 'Onboarding is not required for this caregiver.'; END IF;
 IF v_step.step_key='orientation' THEN RAISE EXCEPTION 'Orientation status is updated automatically.'; END IF;
 IF p_status NOT IN ('not_started','submitted','approved','sent_back','not_applicable') THEN RAISE EXCEPTION 'Invalid onboarding status.'; END IF;
 IF p_no_certificate AND v_step.step_key<>'certificate' THEN RAISE EXCEPTION 'No certificate applies only to the certificate step.'; END IF;
 IF NOT v_admin THEN
  IF v_step.step_number NOT IN (1,2,3,4,5,6) OR v_step.status='approved' OR p_status<>'submitted' OR p_admin_note IS NOT NULL OR p_sent_back_reason IS NOT NULL THEN RAISE EXCEPTION 'Only an administrator can review or change this step.'; END IF;
 END IF;
 IF p_status='sent_back' AND nullif(trim(p_sent_back_reason),'') IS NULL THEN RAISE EXCEPTION 'Enter a reason for sending the step back.'; END IF;
 IF v_step.step_key IN ('photo_id','social_security_card','certificate','tax_payroll_forms','background_check','adult_maltreatment_check','child_maltreatment_check','tmu') AND p_status IN ('submitted','approved') AND NOT (v_step.step_key='certificate' AND p_no_certificate) AND NOT EXISTS(SELECT 1 FROM public.caregiver_documents WHERE step_id=p_step_id AND archived_at IS NULL) THEN RAISE EXCEPTION 'Upload the document first.'; END IF;
 UPDATE public.caregiver_onboarding_steps SET status=p_status,
 submitted_at=CASE WHEN p_status='submitted' THEN now() ELSE submitted_at END,
 approved_at=CASE WHEN p_status='approved' THEN now() ELSE NULL END,
 approved_by=CASE WHEN p_status='approved' THEN auth.uid() ELSE NULL END,
 sent_back_at=CASE WHEN p_status='sent_back' THEN now() ELSE sent_back_at END,
 sent_back_reason=CASE WHEN p_status='sent_back' THEN trim(p_sent_back_reason) ELSE NULL END,
 no_certificate=p_no_certificate, updated_at=now() WHERE id=p_step_id RETURNING * INTO v_step;
 IF v_admin AND p_admin_note IS NOT NULL THEN INSERT INTO public.caregiver_onboarding_admin_notes(step_id,admin_note,updated_by) VALUES(p_step_id,p_admin_note,auth.uid()) ON CONFLICT(step_id) DO UPDATE SET admin_note=EXCLUDED.admin_note,updated_by=EXCLUDED.updated_by,updated_at=now(); END IF;
 RETURN v_step;
END $$;
REVOKE ALL ON FUNCTION public.change_caregiver_onboarding_step(uuid,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_caregiver_onboarding_step(uuid,text,text,text,boolean) TO authenticated;

CREATE VIEW public.caregiver_onboarding_summary WITH (security_invoker=true) AS
 SELECT o.id,o.caregiver_id,c.onboarding_required,o.archived_at,
 CASE WHEN NOT c.onboarding_required THEN 'not_required' WHEN count(s.id) FILTER(WHERE s.status IN ('approved','not_applicable'))=12 THEN 'complete' ELSE 'incomplete' END AS status,
 count(s.id) FILTER(WHERE s.status IN ('approved','not_applicable')) AS completed_steps, count(s.id) AS total_steps
 FROM public.caregiver_onboarding o JOIN public.caregivers c ON c.id=o.caregiver_id JOIN public.caregiver_onboarding_steps s ON s.onboarding_id=o.id GROUP BY o.id,c.id;
GRANT SELECT ON public.caregiver_onboarding_summary TO authenticated,service_role;

CREATE POLICY caregiver_docs_gateway_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated USING(bucket_id<>'caregiver-documents') WITH CHECK(bucket_id<>'caregiver-documents');
COMMENT ON POLICY caregiver_docs_gateway_only ON storage.objects IS 'Private caregiver files are served only by the authenticated gateway, with per-request role/ownership checks and immutable admin view logging. Prevents bypass via Storage signed URLs.';
CREATE INDEX caregiver_documents_by_caregiver ON public.caregiver_documents(caregiver_id,step_id);
CREATE INDEX caregiver_onboarding_history_by_step ON public.caregiver_onboarding_step_history(step_id,changed_at);
CREATE INDEX caregiver_document_views_by_caregiver ON public.caregiver_document_view_log(caregiver_id,viewed_at);
CREATE INDEX caregiver_document_tickets_by_user ON public.caregiver_document_access_tickets(user_id,document_id);
CREATE TRIGGER audit_caregiver_onboarding AFTER INSERT OR UPDATE OR DELETE ON public.caregiver_onboarding FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_caregiver_onboarding_steps AFTER INSERT OR UPDATE OR DELETE ON public.caregiver_onboarding_steps FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_caregiver_documents AFTER INSERT OR UPDATE OR DELETE ON public.caregiver_documents FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();