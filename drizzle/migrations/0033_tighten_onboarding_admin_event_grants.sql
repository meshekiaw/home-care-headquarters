REVOKE ALL ON public.caregiver_onboarding_admin_events FROM anon,authenticated,service_role;
GRANT SELECT ON public.caregiver_onboarding_admin_events TO authenticated;
GRANT SELECT,INSERT ON public.caregiver_onboarding_admin_events TO service_role;