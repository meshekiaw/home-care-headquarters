-- Start (or resume) the draft 618 form for an assessment
CREATE OR REPLACE FUNCTION public.start_618_form(p_assessment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.nurse_assessments;
  v_nurse_id uuid;
  v_form_id uuid;
  is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO a FROM public.nurse_assessments WHERE id = p_assessment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found.' USING ERRCODE = 'no_data_found';
  END IF;

  is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  v_nurse_id := public.current_nurse_id();

  IF NOT is_admin AND (v_nurse_id IS NULL OR a.assigned_nurse_id IS DISTINCT FROM v_nurse_id) THEN
    RAISE EXCEPTION 'This assessment is not assigned to you.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_form_id
  FROM public.assessment_618_forms
  WHERE nurse_assessment_id = p_assessment_id AND status = 'draft'
  LIMIT 1;

  IF v_form_id IS NOT NULL THEN
    RETURN v_form_id;
  END IF;

  INSERT INTO public.assessment_618_forms (
    user_id, nurse_assessment_id, client_id, nurse_id
  ) VALUES (
    a.user_id, a.id, a.client_id, COALESCE(a.assigned_nurse_id, v_nurse_id)
  )
  RETURNING id INTO v_form_id;

  RETURN v_form_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_618_form(uuid) TO authenticated;

-- Add a signature, capturing IP + device from the request itself
CREATE OR REPLACE FUNCTION public.add_618_signature(
  p_form_id uuid,
  p_signer_type text,
  p_signer_name text,
  p_signature_data text,
  p_attestation_text text,
  p_relationship text DEFAULT NULL,
  p_role_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.assessment_618_forms;
  v_headers json;
  v_ip text;
  v_agent text;
  v_id uuid;
  is_admin boolean;
BEGIN
  SELECT * INTO f FROM public.assessment_618_forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form not found.' USING ERRCODE = 'no_data_found';
  END IF;

  is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  IF NOT is_admin AND f.nurse_id IS DISTINCT FROM public.current_nurse_id() THEN
    RAISE EXCEPTION 'This form is not assigned to you.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF f.status <> 'draft' THEN
    RAISE EXCEPTION 'This 618 assessment is already signed and locked.' USING ERRCODE = 'check_violation';
  END IF;

  IF btrim(COALESCE(p_signer_name, '')) = '' OR btrim(COALESCE(p_signature_data, '')) = '' THEN
    RAISE EXCEPTION 'A signer name and a signature are both required.' USING ERRCODE = 'check_violation';
  END IF;

  BEGIN
    v_headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;

  v_ip := COALESCE(
    split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1),
    v_headers->>'cf-connecting-ip'
  );
  v_ip := NULLIF(btrim(COALESCE(v_ip, '')), '');
  v_agent := NULLIF(btrim(COALESCE(v_headers->>'user-agent', '')), '');

  INSERT INTO public.assessment_618_signatures (
    form_id, user_id, signer_type, signer_name, signer_relationship,
    signer_role_description, signer_user_id, captured_by_user_id,
    signature_data, attestation_text, ip_address, user_agent, content_snapshot
  ) VALUES (
    f.id, f.user_id, p_signer_type, btrim(p_signer_name), p_relationship,
    p_role_description,
    CASE WHEN p_signer_type = 'nurse' THEN auth.uid() ELSE NULL END,
    auth.uid(),
    p_signature_data, p_attestation_text, v_ip, v_agent, f.form_data
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_618_signature(uuid, text, text, text, text, text, text) TO authenticated;

-- Complete the form: only succeeds when every required signature exists
CREATE OR REPLACE FUNCTION public.complete_618_form(p_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.assessment_618_forms;
  is_admin boolean;
BEGIN
  SELECT * INTO f FROM public.assessment_618_forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  IF NOT is_admin AND f.nurse_id IS DISTINCT FROM public.current_nurse_id() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_yours');
  END IF;

  IF f.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_locked');
  END IF;

  IF NOT public.form_618_signatures_complete(p_form_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'signatures_incomplete');
  END IF;

  UPDATE public.assessment_618_forms
  SET status = 'signed', signed_at = now()
  WHERE id = p_form_id;

  IF f.amends_form_id IS NOT NULL THEN
    UPDATE public.assessment_618_forms
    SET status = 'amended'
    WHERE id = f.amends_form_id AND status = 'signed';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_618_form(uuid) TO authenticated;