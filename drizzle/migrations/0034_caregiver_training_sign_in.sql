-- The public gateway uses these service-only helpers; no anonymous table access or public signup is enabled.
CREATE OR REPLACE FUNCTION public.lookup_training_caregiver(p_email text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text := lower(regexp_replace(p_email, '\s', '', 'g'));
  v_caregiver public.caregivers%ROWTYPE;
  v_user_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.caregivers WHERE status = 'active' AND lower(regexp_replace(email, '\s', '', 'g')) = v_email) <> 1 THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_caregiver FROM public.caregivers WHERE status = 'active' AND lower(regexp_replace(email, '\s', '', 'g')) = v_email;
  IF (SELECT count(*) FROM auth.users WHERE lower(regexp_replace(email, '\s', '', 'g')) = v_email) > 1 THEN
    RAISE EXCEPTION 'Training login needs office review';
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE lower(regexp_replace(email, '\s', '', 'g')) = v_email;
  IF v_caregiver.auth_user_id IS NOT NULL AND v_caregiver.auth_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Training login needs office review';
  END IF;
  RETURN jsonb_build_object('caregiver_id', v_caregiver.id, 'user_id', v_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.lookup_training_caregiver(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_training_caregiver(text) TO service_role;

-- Lock/recheck identity and atomically connect the record and caregiver role.
CREATE OR REPLACE FUNCTION public.connect_training_caregiver(p_caregiver_id uuid, p_user_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text := lower(regexp_replace(p_email, '\s', '', 'g'));
  v_caregiver public.caregivers%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 0));
  SELECT * INTO v_caregiver FROM public.caregivers WHERE id = p_caregiver_id FOR UPDATE;
  IF NOT FOUND OR v_caregiver.status <> 'active'
      OR lower(regexp_replace(v_caregiver.email, '\s', '', 'g')) IS DISTINCT FROM v_email
      OR (SELECT count(*) FROM public.caregivers WHERE status = 'active' AND lower(regexp_replace(email, '\s', '', 'g')) = v_email) <> 1
      OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id AND lower(regexp_replace(email, '\s', '', 'g')) = v_email)
      OR (v_caregiver.auth_user_id IS NOT NULL AND v_caregiver.auth_user_id <> p_user_id)
      OR EXISTS (SELECT 1 FROM public.caregivers WHERE auth_user_id = p_user_id AND id <> p_caregiver_id) THEN
    RAISE EXCEPTION 'Training login needs office review';
  END IF;
  PERFORM 1 FROM auth.users WHERE id = p_user_id FOR UPDATE;
  -- Protected roles remain exactly as they are; nurse/caregiver exclusivity is unchanged.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role IN ('admin', 'nurse')) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, 'caregiver') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  IF v_caregiver.auth_user_id IS NULL THEN
    UPDATE public.caregivers SET auth_user_id = p_user_id WHERE id = p_caregiver_id;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.connect_training_caregiver(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.connect_training_caregiver(uuid, uuid, text) TO service_role;