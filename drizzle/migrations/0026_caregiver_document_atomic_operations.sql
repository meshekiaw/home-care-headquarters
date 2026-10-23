CREATE FUNCTION public.register_caregiver_document(p_actor_id uuid,p_caregiver_id uuid,p_step_id uuid,p_document_id uuid,p_object_path text,p_file_name text,p_mime_type text,p_file_size bigint) RETURNS public.caregiver_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_step public.caregiver_onboarding_steps; v_caregiver public.caregivers; v_admin boolean; v_doc public.caregiver_documents;
BEGIN
 SELECT * INTO v_step FROM public.caregiver_onboarding_steps WHERE id=p_step_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Step not found.'; END IF;
 SELECT c.* INTO v_caregiver FROM public.caregivers c JOIN public.caregiver_onboarding o ON o.caregiver_id=c.id WHERE o.id=v_step.onboarding_id AND c.id=p_caregiver_id AND o.archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Caregiver onboarding not found.'; END IF;
 IF public.has_role(p_actor_id,'nurse') THEN RAISE EXCEPTION 'Access denied.'; END IF;
 v_admin:=public.has_role(p_actor_id,'admin');
 IF NOT v_admin AND NOT (public.has_role(p_actor_id,'caregiver') AND v_caregiver.auth_user_id=p_actor_id AND v_caregiver.status<>'inactive' AND v_step.step_key IN ('photo_id','social_security_card','certificate') AND v_step.status<>'approved') THEN RAISE EXCEPTION 'You cannot upload or replace this document.'; END IF;
 IF v_step.step_key NOT IN ('photo_id','social_security_card','certificate','tax_payroll_forms','background_check','adult_maltreatment_check','child_maltreatment_check','tmu') THEN RAISE EXCEPTION 'This step does not accept file uploads.'; END IF;
 IF p_object_path NOT LIKE p_caregiver_id::text||'/'||v_step.step_key||'/'||p_document_id::text||'/%' THEN RAISE EXCEPTION 'Invalid document location.'; END IF;
 INSERT INTO public.caregiver_documents(id,caregiver_id,step_id,object_path,file_name,mime_type,file_size,uploaded_by) VALUES(p_document_id,p_caregiver_id,p_step_id,p_object_path,p_file_name,p_mime_type,p_file_size,p_actor_id) RETURNING * INTO v_doc;
 RETURN v_doc;
END $$;
REVOKE ALL ON FUNCTION public.register_caregiver_document(uuid,uuid,uuid,uuid,text,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_caregiver_document(uuid,uuid,uuid,uuid,text,text,text,bigint) TO service_role;
COMMENT ON COLUMN public.caregiver_onboarding_steps.file_paths IS 'DEPRECATED: file links use caregiver_documents.step_id so RLS hides office-uploaded filenames and paths from caregivers; leave this legacy placeholder empty.';

CREATE FUNCTION public.archive_caregiver_document(p_document_id uuid,p_actor_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_doc public.caregiver_documents; v_step public.caregiver_onboarding_steps; v_caregiver public.caregivers; v_admin boolean;
BEGIN
 SELECT s.* INTO v_step FROM public.caregiver_onboarding_steps s JOIN public.caregiver_documents d ON d.step_id=s.id WHERE d.id=p_document_id FOR UPDATE OF s;
 IF NOT FOUND THEN RAISE EXCEPTION 'Document not found.'; END IF;
 SELECT * INTO v_doc FROM public.caregiver_documents WHERE id=p_document_id AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Document not found.'; END IF;
 SELECT * INTO v_caregiver FROM public.caregivers WHERE id=v_doc.caregiver_id;
 IF public.has_role(p_actor_id,'nurse') THEN RAISE EXCEPTION 'Access denied.'; END IF;
 v_admin:=public.has_role(p_actor_id,'admin');
 IF NOT v_admin AND NOT (public.has_role(p_actor_id,'caregiver') AND v_caregiver.auth_user_id=p_actor_id AND v_caregiver.status<>'inactive' AND v_doc.uploaded_by=p_actor_id AND v_step.status<>'approved') THEN RAISE EXCEPTION 'An approved or office-uploaded file cannot be removed.'; END IF;
 UPDATE public.caregiver_documents SET archived_at=now() WHERE id=p_document_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.archive_caregiver_document(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.archive_caregiver_document(uuid,uuid) TO service_role;

CREATE FUNCTION public.archive_caregiver_onboarding(p_onboarding_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Admin access required.'; END IF;
 UPDATE public.caregiver_onboarding SET archived_at=now() WHERE id=p_onboarding_id;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.archive_caregiver_onboarding(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.archive_caregiver_onboarding(uuid) TO authenticated;
