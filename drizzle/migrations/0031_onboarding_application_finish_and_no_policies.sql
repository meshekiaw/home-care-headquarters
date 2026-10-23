CREATE OR REPLACE FUNCTION public.submit_onboarding_application()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.caregiver_onboarding_steps;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'caregiver') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Caregiver sign-in required.'; END IF;
 SELECT st.* INTO s FROM public.caregiver_onboarding_steps st JOIN public.caregiver_onboarding o ON o.id=st.onboarding_id JOIN public.caregivers c ON c.id=o.caregiver_id WHERE c.auth_user_id=auth.uid() AND c.onboarding_required AND c.status<>'inactive' AND o.archived_at IS NULL AND st.step_key='hiring_application' FOR UPDATE OF st;
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is not available.'; END IF;
 IF s.status NOT IN ('not_started','sent_back') THEN RAISE EXCEPTION 'This step has already been submitted or approved.'; END IF;
 UPDATE public.caregiver_onboarding_steps SET status='submitted',submitted_at=now(),updated_at=now() WHERE id=s.id;
 RETURN true;
END $function$;
REVOKE ALL ON FUNCTION public.submit_onboarding_application() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_onboarding_application() TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_my_onboarding_receipts()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_caregiver uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'caregiver') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Caregiver sign-in required.'; END IF;
 SELECT id INTO v_caregiver FROM public.caregivers WHERE auth_user_id=auth.uid() AND onboarding_required AND status<>'inactive';
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.caregiver_onboarding_steps s SET status='submitted',submitted_at=a.submitted_at,updated_at=now() FROM public.caregiver_onboarding o JOIN public.caregiver_applications a ON a.caregiver_id=o.caregiver_id WHERE s.onboarding_id=o.id AND o.caregiver_id=v_caregiver AND o.archived_at IS NULL AND s.step_key='hiring_application' AND s.status='not_started' AND(a.status='submitted' OR a.submitted_at IS NOT NULL);
 UPDATE public.caregiver_onboarding_steps s SET status='submitted',submitted_at=now(),updated_at=now() FROM public.caregiver_onboarding o WHERE s.onboarding_id=o.id AND o.caregiver_id=v_caregiver AND o.archived_at IS NULL AND s.step_key='policy_signoffs' AND s.status='not_started'
  AND EXISTS(SELECT 1 FROM public.lms_policies p WHERE p.is_active)
  AND NOT EXISTS(SELECT 1 FROM public.lms_policies p WHERE p.is_active AND NOT EXISTS(SELECT 1 FROM public.lms_policy_acknowledgments a WHERE a.policy_id=p.id AND a.caregiver_id=v_caregiver));
 RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.submit_onboarding_policy_signoffs()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.caregiver_onboarding_steps; v_caregiver uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'caregiver') OR public.has_role(auth.uid(),'nurse') THEN RAISE EXCEPTION 'Caregiver sign-in required.'; END IF;
 SELECT c.id INTO v_caregiver FROM public.caregivers c WHERE c.auth_user_id=auth.uid() AND c.onboarding_required AND c.status<>'inactive';
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is not available.'; END IF;
 SELECT st.* INTO s FROM public.caregiver_onboarding_steps st JOIN public.caregiver_onboarding o ON o.id=st.onboarding_id WHERE o.caregiver_id=v_caregiver AND o.archived_at IS NULL AND st.step_key='policy_signoffs' FOR UPDATE OF st;
 IF NOT FOUND THEN RAISE EXCEPTION 'Onboarding is not available.'; END IF;
 IF s.status='approved' THEN RETURN true; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lms_policies p WHERE p.is_active) THEN RAISE EXCEPTION 'There are no policies to sign yet.'; END IF;
 IF EXISTS(SELECT 1 FROM public.lms_policies p WHERE p.is_active AND NOT EXISTS(SELECT 1 FROM public.lms_policy_acknowledgments a WHERE a.policy_id=p.id AND a.caregiver_id=v_caregiver)) THEN RAISE EXCEPTION 'Acknowledge every published policy first.'; END IF;
 UPDATE public.caregiver_onboarding_steps SET status='submitted',submitted_at=now(),sent_back_reason=NULL,updated_at=now() WHERE id=s.id;
 RETURN true;
END $function$;