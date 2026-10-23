ALTER TABLE public.caregiver_onboarding_steps ADD COLUMN certificate_name text CHECK(certificate_name IS NULL OR length(certificate_name) BETWEEN 1 AND 150);
CREATE POLICY onboarding_portal_published_policy_read ON public.lms_policies FOR SELECT TO authenticated USING(is_active AND public.has_role(auth.uid(),'caregiver') AND NOT public.has_role(auth.uid(),'nurse') AND EXISTS(SELECT 1 FROM public.caregivers c WHERE c.auth_user_id=auth.uid() AND c.onboarding_required AND c.status<>'inactive'));
GRANT SELECT ON public.lms_policies TO authenticated;
CREATE POLICY onboarding_steps_caregiver_visible_only ON public.caregiver_onboarding_steps AS RESTRICTIVE FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR step_number IN(1,2,3,4,5,6,12));
CREATE POLICY onboarding_history_caregiver_visible_only ON public.caregiver_onboarding_step_history AS RESTRICTIVE FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.caregiver_onboarding_steps s WHERE s.id=step_id AND s.step_number IN(1,2,3,4,5,6,12)));
CREATE FUNCTION public.save_onboarding_contact(p_contact jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.caregivers; s public.caregiver_onboarding_steps; k text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'caregiver') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Caregiver sign-in required.'; END IF;
 SELECT * INTO c FROM public.caregivers WHERE auth_user_id=auth.uid() AND onboarding_required AND status<>'inactive' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is not available.'; END IF;
 SELECT st.* INTO s FROM public.caregiver_onboarding_steps st JOIN public.caregiver_onboarding o ON o.id=st.onboarding_id WHERE o.caregiver_id=c.id AND o.archived_at IS NULL AND st.step_key='personal_information' FOR UPDATE OF st;
 IF NOT FOUND OR s.status='approved' THEN RAISE EXCEPTION 'This step is unavailable or approved.'; END IF;
 IF p_contact IS NULL OR jsonb_typeof(p_contact)<>'object' THEN RAISE EXCEPTION 'Enter the contact fields only.'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_contact))<>8 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_contact) x WHERE x NOT IN('address','city','state','zip_code','phone','emergency_contact_name','emergency_contact_relationship','emergency_contact_phone')) THEN RAISE EXCEPTION 'Enter the contact fields only.'; END IF;
 FOREACH k IN ARRAY ARRAY['address','city','state','zip_code','phone','emergency_contact_name','emergency_contact_relationship','emergency_contact_phone'] LOOP
  IF jsonb_typeof(p_contact->k) IS DISTINCT FROM 'string' OR nullif(btrim(p_contact->>k),'') IS NULL OR length(p_contact->>k)>(CASE WHEN k='address' THEN 200 WHEN k IN('phone','emergency_contact_phone') THEN 30 ELSE 100 END) THEN RAISE EXCEPTION 'Complete the contact fields with valid values.'; END IF;
 END LOOP;
 IF btrim(p_contact->>'state') !~ '^[A-Za-z]{2}$' OR btrim(p_contact->>'zip_code') !~ '^[0-9]{5}(-[0-9]{4})?$' THEN RAISE EXCEPTION 'Enter a valid state and ZIP code.'; END IF;
 FOREACH k IN ARRAY ARRAY['phone','emergency_contact_phone'] LOOP
  IF (p_contact->>k) !~ '^[+()0-9 .-]+$' OR length(regexp_replace(p_contact->>k,'[^0-9]','','g')) NOT BETWEEN 10 AND 15 THEN RAISE EXCEPTION 'Enter valid phone numbers.'; END IF;
 END LOOP;
 UPDATE public.caregivers SET address=btrim(p_contact->>'address'),city=btrim(p_contact->>'city'),state=upper(btrim(p_contact->>'state')),zip_code=btrim(p_contact->>'zip_code'),phone=btrim(p_contact->>'phone'),emergency_contact_name=btrim(p_contact->>'emergency_contact_name'),emergency_contact_relationship=btrim(p_contact->>'emergency_contact_relationship'),emergency_contact_phone=btrim(p_contact->>'emergency_contact_phone') WHERE id=c.id;
 UPDATE public.caregiver_onboarding_steps SET status='submitted',submitted_at=now(),sent_back_reason=NULL,updated_at=now() WHERE id=s.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.save_onboarding_contact(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_onboarding_contact(jsonb) TO authenticated;
CREATE FUNCTION public.save_onboarding_certificate(p_name text,p_no_certificate boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.caregiver_onboarding_steps;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'caregiver') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Caregiver sign-in required.'; END IF;
 SELECT st.* INTO s FROM public.caregiver_onboarding_steps st JOIN public.caregiver_onboarding o ON o.id=st.onboarding_id JOIN public.caregivers c ON c.id=o.caregiver_id WHERE c.auth_user_id=auth.uid() AND c.onboarding_required AND c.status<>'inactive' AND o.archived_at IS NULL AND st.step_key='certificate' FOR UPDATE OF st;
 IF NOT FOUND OR s.status='approved' THEN RAISE EXCEPTION 'This step is unavailable or approved.'; END IF;
 IF p_no_certificate IS NULL OR(NOT p_no_certificate AND(nullif(btrim(p_name),'') IS NULL OR length(btrim(p_name))>150)) THEN RAISE EXCEPTION 'Enter a certificate name or select no certificate.'; END IF;
 UPDATE public.caregiver_onboarding_steps SET certificate_name=CASE WHEN p_no_certificate THEN NULL ELSE btrim(p_name) END,no_certificate=p_no_certificate,status=CASE WHEN p_no_certificate THEN 'not_applicable' WHEN EXISTS(SELECT 1 FROM public.caregiver_documents d WHERE d.step_id=s.id AND d.archived_at IS NULL AND d.uploaded_by=auth.uid()) THEN 'submitted' ELSE 'not_started' END,submitted_at=now(),sent_back_reason=NULL,updated_at=now() WHERE id=s.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.save_onboarding_certificate(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_onboarding_certificate(text,boolean) TO authenticated;
CREATE FUNCTION public.submit_onboarding_policy_signoffs() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.caregiver_onboarding_steps; v_caregiver uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'caregiver') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Caregiver sign-in required.'; END IF;
 SELECT c.id INTO v_caregiver FROM public.caregivers c WHERE c.auth_user_id=auth.uid() AND c.onboarding_required AND c.status<>'inactive';
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is not available.'; END IF;
 SELECT st.* INTO s FROM public.caregiver_onboarding_steps st JOIN public.caregiver_onboarding o ON o.id=st.onboarding_id WHERE o.caregiver_id=v_caregiver AND o.archived_at IS NULL AND st.step_key='policy_signoffs' FOR UPDATE OF st;
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is not available.'; END IF;
 IF s.status='approved' THEN RETURN true; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_policies p WHERE p.is_active AND NOT EXISTS(SELECT 1 FROM public.lms_policy_acknowledgments a WHERE a.policy_id=p.id AND a.caregiver_id=v_caregiver)) THEN RAISE EXCEPTION 'Acknowledge every published policy first.'; END IF;
 UPDATE public.caregiver_onboarding_steps SET status='submitted',submitted_at=now(),sent_back_reason=NULL,updated_at=now() WHERE id=s.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_onboarding_policy_signoffs() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_onboarding_policy_signoffs() TO authenticated;
CREATE FUNCTION public.acknowledge_onboarding_policy(p_policy_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_caregiver uuid; s public.caregiver_onboarding_steps;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'caregiver') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Caregiver sign-in required.'; END IF;
 SELECT id INTO v_caregiver FROM public.caregivers WHERE auth_user_id=auth.uid() AND onboarding_required AND status<>'inactive';
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is not available.'; END IF;
 SELECT st.* INTO s FROM public.caregiver_onboarding_steps st JOIN public.caregiver_onboarding o ON o.id=st.onboarding_id WHERE o.caregiver_id=v_caregiver AND o.archived_at IS NULL AND st.step_key='policy_signoffs' FOR UPDATE OF st;
 IF NOT FOUND OR s.status='approved' THEN RAISE EXCEPTION 'This step is unavailable or approved.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_policies WHERE id=p_policy_id AND is_active) THEN RAISE EXCEPTION 'This policy is no longer published.'; END IF;
 INSERT INTO public.lms_policy_acknowledgments(user_id,caregiver_id,policy_id) SELECT auth.uid(),v_caregiver,p_policy_id WHERE NOT EXISTS(SELECT 1 FROM public.lms_policy_acknowledgments WHERE caregiver_id=v_caregiver AND policy_id=p_policy_id);
 IF NOT EXISTS(SELECT 1 FROM public.lms_policies p WHERE p.is_active AND NOT EXISTS(SELECT 1 FROM public.lms_policy_acknowledgments a WHERE a.caregiver_id=v_caregiver AND a.policy_id=p.id)) THEN PERFORM public.submit_onboarding_policy_signoffs(); END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.acknowledge_onboarding_policy(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_onboarding_policy(uuid) TO authenticated;
CREATE FUNCTION public.sync_application_to_onboarding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='submitted' OR NEW.submitted_at IS NOT NULL THEN
  UPDATE public.caregiver_onboarding_steps s SET status='submitted',submitted_at=coalesce(NEW.submitted_at,now()),sent_back_reason=NULL,updated_at=now() FROM public.caregiver_onboarding o JOIN public.caregivers c ON c.id=o.caregiver_id WHERE s.onboarding_id=o.id AND o.caregiver_id=NEW.caregiver_id AND o.archived_at IS NULL AND c.onboarding_required AND s.step_key='hiring_application' AND s.status<>'approved' AND(s.status='not_started' OR(s.status='sent_back' AND coalesce(NEW.submitted_at,now())>s.sent_back_at));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER onboarding_reads_application_submission AFTER INSERT OR UPDATE OF status,submitted_at ON public.caregiver_applications FOR EACH ROW EXECUTE FUNCTION public.sync_application_to_onboarding();
REVOKE ALL ON FUNCTION public.sync_application_to_onboarding() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_application_to_onboarding() TO service_role;
CREATE FUNCTION public.sync_policy_to_onboarding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.caregiver_onboarding_steps s SET status='submitted',submitted_at=now(),sent_back_reason=NULL,updated_at=now() FROM public.caregiver_onboarding o JOIN public.caregivers c ON c.id=o.caregiver_id WHERE s.onboarding_id=o.id AND o.caregiver_id=NEW.caregiver_id AND c.onboarding_required AND o.archived_at IS NULL AND s.step_key='policy_signoffs' AND s.status IN('not_started','sent_back') AND NOT EXISTS(SELECT 1 FROM public.lms_policies p WHERE p.is_active AND NOT EXISTS(SELECT 1 FROM public.lms_policy_acknowledgments a WHERE a.policy_id=p.id AND a.caregiver_id=NEW.caregiver_id));
 RETURN NEW;
END $$;
CREATE TRIGGER onboarding_reads_policy_acknowledgment AFTER INSERT ON public.lms_policy_acknowledgments FOR EACH ROW EXECUTE FUNCTION public.sync_policy_to_onboarding();
REVOKE ALL ON FUNCTION public.sync_policy_to_onboarding() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_policy_to_onboarding() TO service_role;
CREATE FUNCTION public.enforce_portal_document_limits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.caregiver_onboarding_steps;
BEGIN
 SELECT * INTO s FROM public.caregiver_onboarding_steps WHERE id=NEW.step_id FOR UPDATE;
 IF s.step_key IN('photo_id','social_security_card','certificate') AND public.has_role(NEW.uploaded_by,'caregiver') AND NOT public.has_role(NEW.uploaded_by,'admin') THEN
  IF NOT EXISTS(SELECT 1 FROM public.caregivers c WHERE c.id=NEW.caregiver_id AND c.auth_user_id=NEW.uploaded_by AND c.onboarding_required AND c.status<>'inactive') OR s.status='approved' THEN RAISE EXCEPTION 'This step is unavailable or approved.'; END IF;
  IF NEW.file_size>10485760 THEN RAISE EXCEPTION 'Choose a file up to 10 MB.'; END IF;
  IF(SELECT count(*) FROM public.caregiver_documents d WHERE d.step_id=NEW.step_id AND d.uploaded_by=NEW.uploaded_by AND d.archived_at IS NULL)>=2 THEN RAISE EXCEPTION 'Each step allows two files.'; END IF;
  UPDATE public.caregiver_onboarding_steps SET status=CASE WHEN s.step_key='certificate' AND s.certificate_name IS NULL THEN 'not_started' ELSE 'submitted' END,no_certificate=false,submitted_at=now(),sent_back_reason=NULL,updated_at=now() WHERE id=s.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER enforce_portal_document_limits BEFORE INSERT ON public.caregiver_documents FOR EACH ROW EXECUTE FUNCTION public.enforce_portal_document_limits();
REVOKE ALL ON FUNCTION public.enforce_portal_document_limits() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_portal_document_limits() TO service_role;
CREATE FUNCTION public.refresh_my_onboarding_receipts() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_caregiver uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'caregiver') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Caregiver sign-in required.'; END IF;
 SELECT id INTO v_caregiver FROM public.caregivers WHERE auth_user_id=auth.uid() AND onboarding_required AND status<>'inactive';
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.caregiver_onboarding_steps s SET status='submitted',submitted_at=a.submitted_at,updated_at=now() FROM public.caregiver_onboarding o JOIN public.caregiver_applications a ON a.caregiver_id=o.caregiver_id WHERE s.onboarding_id=o.id AND o.caregiver_id=v_caregiver AND o.archived_at IS NULL AND s.step_key='hiring_application' AND s.status='not_started' AND(a.status='submitted' OR a.submitted_at IS NOT NULL);
 UPDATE public.caregiver_onboarding_steps s SET status='submitted',submitted_at=now(),updated_at=now() FROM public.caregiver_onboarding o WHERE s.onboarding_id=o.id AND o.caregiver_id=v_caregiver AND o.archived_at IS NULL AND s.step_key='policy_signoffs' AND s.status='not_started' AND NOT EXISTS(SELECT 1 FROM public.lms_policies p WHERE p.is_active AND NOT EXISTS(SELECT 1 FROM public.lms_policy_acknowledgments a WHERE a.policy_id=p.id AND a.caregiver_id=v_caregiver));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.refresh_my_onboarding_receipts() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_onboarding_receipts() TO authenticated;