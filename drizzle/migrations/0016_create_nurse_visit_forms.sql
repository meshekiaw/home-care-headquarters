-- Nurse Visit form (VA clients), Revised 03/21 source document.
-- Same protections as the 618: draft/signed lifecycle, insert-only signatures,
-- content fingerprint, locking on completion, amendments, audit logging.

CREATE TABLE public.nurse_visit_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nurse_assessment_id uuid NOT NULL REFERENCES public.nurse_assessments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nurse_id uuid REFERENCES public.nurses(id),
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  amends_form_id uuid REFERENCES public.nurse_visit_forms(id),
  amendment_reason text,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text,
  client_signature_status text NOT NULL DEFAULT 'pending',
  client_signature_exception_reason text,
  signed_at timestamptz,
  last_autosaved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nurse_visit_forms_status_check
    CHECK (status IN ('draft', 'signed', 'amended', 'voided')),
  CONSTRAINT nurse_visit_forms_client_sig_status_check
    CHECK (client_signature_status IN (
      'pending', 'client_signed', 'representative_signed', 'witness_signed',
      'unable_physical', 'unable_cognitive', 'refused'
    ))
);

CREATE INDEX idx_nv_forms_assessment ON public.nurse_visit_forms(nurse_assessment_id);
CREATE INDEX idx_nv_forms_client ON public.nurse_visit_forms(client_id);
CREATE INDEX idx_nv_forms_nurse ON public.nurse_visit_forms(nurse_id);
CREATE UNIQUE INDEX idx_nv_forms_one_draft_per_assessment
  ON public.nurse_visit_forms(nurse_assessment_id)
  WHERE status = 'draft';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nurse_visit_forms TO authenticated;
GRANT ALL ON public.nurse_visit_forms TO service_role;

ALTER TABLE public.nurse_visit_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all nurse visit forms"
ON public.nurse_visit_forms FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nurses view their own nurse visit forms"
ON public.nurse_visit_forms FOR SELECT TO authenticated
USING (nurse_id = public.current_nurse_id());

CREATE POLICY "Nurses create their own nurse visit forms"
ON public.nurse_visit_forms FOR INSERT TO authenticated
WITH CHECK (nurse_id = public.current_nurse_id());

CREATE POLICY "Nurses update their own nurse visit forms"
ON public.nurse_visit_forms FOR UPDATE TO authenticated
USING (nurse_id = public.current_nurse_id())
WITH CHECK (nurse_id = public.current_nurse_id());

-- ---------------------------------------------------------------------------
-- Signatures: insert-only ledger, one row per slot
-- ---------------------------------------------------------------------------
CREATE TABLE public.nurse_visit_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.nurse_visit_forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  signature_slot text NOT NULL,
  signer_type text NOT NULL,
  signer_name text NOT NULL,
  signer_relationship text,
  signer_role_description text,
  signer_user_id uuid,
  captured_by_user_id uuid,
  signature_data text NOT NULL,
  attestation_text text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  content_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nurse_visit_signatures_slot_check
    CHECK (signature_slot IN ('client', 'nurse')),
  CONSTRAINT nurse_visit_signatures_type_check
    CHECK (signer_type IN ('nurse', 'client', 'representative', 'witness'))
);

CREATE INDEX idx_nv_signatures_form ON public.nurse_visit_signatures(form_id);
CREATE UNIQUE INDEX idx_nv_signatures_one_per_slot
  ON public.nurse_visit_signatures(form_id, signature_slot);

GRANT SELECT, INSERT ON public.nurse_visit_signatures TO authenticated;
GRANT ALL ON public.nurse_visit_signatures TO service_role;

ALTER TABLE public.nurse_visit_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all nurse visit signatures"
ON public.nurse_visit_signatures FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nurses view signatures on their nurse visit forms"
ON public.nurse_visit_signatures FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.nurse_visit_forms f
  WHERE f.id = form_id AND f.nurse_id = public.current_nurse_id()
));

CREATE POLICY "Nurses and admins add nurse visit signatures"
ON public.nurse_visit_signatures FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.nurse_visit_forms f
    WHERE f.id = form_id AND f.nurse_id = public.current_nurse_id()
  )
);

CREATE OR REPLACE FUNCTION public.block_nurse_visit_signature_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Signatures on a Nurse Visit form are permanent and cannot be % .', lower(TG_OP)
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER block_nurse_visit_signature_mutation
BEFORE UPDATE OR DELETE ON public.nurse_visit_signatures
FOR EACH ROW EXECUTE FUNCTION public.block_nurse_visit_signature_mutation();

-- ---------------------------------------------------------------------------
-- Fingerprint over form content plus every signature
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_nurse_visit_content_hash(p_form_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload text;
BEGIN
  SELECT
    f.id::text || '|' || f.version::text || '|' || f.form_data::text || '|' ||
    COALESCE(f.client_signature_status, '') || '|' ||
    COALESCE(f.client_signature_exception_reason, '') || '|' ||
    COALESCE((
      SELECT string_agg(
        s.signature_slot || ':' || s.signer_type || ':' || s.signer_name || ':' ||
        COALESCE(s.signer_relationship, '') || ':' ||
        s.attestation_text || ':' ||
        to_char(s.signed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || ':' ||
        encode(sha256(convert_to(s.signature_data, 'UTF8')), 'hex'),
        '||' ORDER BY s.signature_slot, s.signed_at)
      FROM public.nurse_visit_signatures s
      WHERE s.form_id = f.id
    ), '')
  INTO payload
  FROM public.nurse_visit_forms f
  WHERE f.id = p_form_id;

  IF payload IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN encode(sha256(convert_to(payload, 'UTF8')), 'hex');
END;
$$;

-- ---------------------------------------------------------------------------
-- Field-level validation of the Nurse Visit form body.
-- Returns the list of problems; an empty array means the form is complete.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nurse_visit_form_problems(p_form_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d jsonb;
  problems text[] := ARRAY[]::text[];
  yn text;
  has_no boolean := false;
  hosp jsonb;
  row_item jsonb;
  mobility jsonb;
BEGIN
  SELECT form_data INTO d FROM public.nurse_visit_forms WHERE id = p_form_id;
  IF d IS NULL THEN
    RETURN ARRAY['The form could not be found.'];
  END IF;

  -- Header
  IF btrim(COALESCE(d->>'client_name', '')) = '' THEN
    problems := problems || 'Client name is required.';
  END IF;
  IF btrim(COALESCE(d->>'visit_date', '')) = '' THEN
    problems := problems || 'Date is required.';
  END IF;
  IF btrim(COALESCE(d->>'caregiver_name', '')) = '' THEN
    problems := problems || 'Caregiver name is required.';
  END IF;
  IF COALESCE(d->>'caregiver_present', '') NOT IN ('Yes', 'No') THEN
    problems := problems || 'Caregiver present must be answered Yes or No.';
  END IF;

  -- Type of services: at least one
  IF COALESCE(jsonb_array_length(COALESCE(d->'service_types', '[]'::jsonb)), 0) = 0 THEN
    problems := problems || 'At least one type of service must be checked.';
  END IF;

  -- Mobility level: at least one; device sub-selection when a device is used
  mobility := COALESCE(d->'mobility', '[]'::jsonb);
  IF COALESCE(jsonb_array_length(mobility), 0) = 0 THEN
    problems := problems || 'At least one mobility level must be checked.';
  END IF;
  IF mobility ? 'walks_with_device'
     AND COALESCE(jsonb_array_length(COALESCE(d->'mobility_devices', '[]'::jsonb)), 0) = 0 THEN
    problems := problems || 'Select which device the client walks with.';
  END IF;

  -- Client responses to service (Yes/No/N/A)
  FOR yn IN SELECT unnest(ARRAY['pleased_with_care', 'follows_service_plan', 'conduct_and_schedule']) LOOP
    IF COALESCE(d->'client_responses'->>yn, '') NOT IN ('Yes', 'No', 'N/A') THEN
      problems := problems || 'Every client response to service must be answered.';
      EXIT;
    END IF;
  END LOOP;

  -- Performance of caregiver (Yes/No/N/A)
  FOR yn IN SELECT unnest(ARRAY['performs_tasks', 'relates_well', 'caring_and_sympathetic']) LOOP
    IF COALESCE(d->'caregiver_performance'->>yn, '') NOT IN ('Yes', 'No', 'N/A') THEN
      problems := problems || 'Every caregiver performance item must be answered.';
      EXIT;
    END IF;
  END LOOP;

  -- Hospitalization
  IF COALESCE(d->>'hospitalized', '') NOT IN ('Yes', 'No') THEN
    problems := problems || 'Answer whether the client has been hospitalized since the previous supervisory visit.';
  ELSIF d->>'hospitalized' = 'Yes' THEN
    hosp := COALESCE(d->'hospitalizations', '[]'::jsonb);
    IF COALESCE(jsonb_array_length(hosp), 0) = 0 THEN
      problems := problems || 'Add at least one hospitalization with the admit and discharge details.';
    ELSE
      FOR row_item IN SELECT jsonb_array_elements(hosp) LOOP
        IF btrim(COALESCE(row_item->>'admit_date', '')) = ''
           OR btrim(COALESCE(row_item->>'admit_time', '')) = ''
           OR btrim(COALESCE(row_item->>'hospital', '')) = ''
           OR btrim(COALESCE(row_item->>'discharge_date', '')) = ''
           OR btrim(COALESCE(row_item->>'discharge_time', '')) = '' THEN
          problems := problems || 'Each hospitalization needs an admit date and time, hospital, and discharge date and time.';
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Service plan questions (Yes/No)
  FOR yn IN SELECT unnest(ARRAY['plan_adequate', 'needs_changes', 'needs_copy']) LOOP
    IF COALESCE(d->'service_plan'->>yn, '') NOT IN ('Yes', 'No') THEN
      problems := problems || 'Every service plan question must be answered Yes or No.';
      EXIT;
    END IF;
  END LOOP;

  -- Comments are required
  IF btrim(COALESCE(d->>'comments', '')) = '' THEN
    problems := problems || 'Assistive devices / comments / further instructions is required.';
  END IF;

  -- Any "No" answer must be documented in the comments
  SELECT bool_or(v = 'No') INTO has_no FROM (
    SELECT value AS v FROM jsonb_each_text(COALESCE(d->'client_responses', '{}'::jsonb))
    UNION ALL
    SELECT value AS v FROM jsonb_each_text(COALESCE(d->'caregiver_performance', '{}'::jsonb))
    UNION ALL
    SELECT value AS v FROM jsonb_each_text(COALESCE(d->'service_plan', '{}'::jsonb))
    UNION ALL
    SELECT COALESCE(d->>'caregiver_present', '') AS v
  ) answers;

  IF COALESCE(has_no, false) AND length(btrim(COALESCE(d->>'comments', ''))) < 10 THEN
    problems := problems ||
      'A "No" answer was recorded, so it must be documented in the comments before the form can be completed.';
  END IF;

  RETURN problems;
END;
$$;

-- Required signatures: client (or documented exception with representative /
-- witness) plus the registered nurse.
CREATE OR REPLACE FUNCTION public.nurse_visit_signatures_complete(p_form_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.nurse_visit_forms;
  client_sig public.nurse_visit_signatures;
  has_nurse boolean;
BEGIN
  SELECT * INTO f FROM public.nurse_visit_forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT bool_or(signature_slot = 'nurse') INTO has_nurse
  FROM public.nurse_visit_signatures WHERE form_id = p_form_id;

  IF COALESCE(has_nurse, false) IS NOT TRUE THEN
    RETURN false;
  END IF;

  SELECT * INTO client_sig FROM public.nurse_visit_signatures
  WHERE form_id = p_form_id AND signature_slot = 'client';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF f.client_signature_status IN ('unable_physical', 'unable_cognitive', 'refused') THEN
    RETURN btrim(COALESCE(f.client_signature_exception_reason, '')) <> ''
      AND client_sig.signer_type IN ('representative', 'witness');
  END IF;

  RETURN client_sig.signer_type IN ('client', 'representative');
END;
$$;

-- ---------------------------------------------------------------------------
-- Locking, amendments, fingerprint refresh
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_nurse_visit_form_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'A signed Nurse Visit form cannot be deleted. Record a correction instead.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'This Nurse Visit form was signed on % and can no longer be changed. Add a correction instead.',
      to_char(OLD.signed_at, 'MM/DD/YYYY') USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'signed' THEN
    IF array_length(public.nurse_visit_form_problems(NEW.id), 1) > 0 THEN
      RAISE EXCEPTION 'Every required field must be filled in before the Nurse Visit form can be completed.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT public.nurse_visit_signatures_complete(NEW.id) THEN
      RAISE EXCEPTION 'All required signatures must be captured before the Nurse Visit form can be completed.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.signed_at IS NULL THEN
      NEW.signed_at := now();
    END IF;
  END IF;

  NEW.updated_at := now();
  NEW.content_hash := public.compute_nurse_visit_content_hash(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_nurse_visit_form_lock
BEFORE UPDATE OR DELETE ON public.nurse_visit_forms
FOR EACH ROW EXECUTE FUNCTION public.enforce_nurse_visit_form_lock();

CREATE OR REPLACE FUNCTION public.enforce_nurse_visit_amendment_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent public.nurse_visit_forms;
BEGIN
  IF NEW.amends_form_id IS NOT NULL THEN
    IF btrim(COALESCE(NEW.amendment_reason, '')) = '' THEN
      RAISE EXCEPTION 'A correction to a Nurse Visit form must include a reason.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT * INTO parent FROM public.nurse_visit_forms WHERE id = NEW.amends_form_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'The Nurse Visit form being corrected does not exist.'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    NEW.version := parent.version + 1;
    NEW.nurse_assessment_id := parent.nurse_assessment_id;
    NEW.client_id := parent.client_id;
  END IF;

  NEW.content_hash := public.compute_nurse_visit_content_hash(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_nurse_visit_amendment_rules
BEFORE INSERT ON public.nurse_visit_forms
FOR EACH ROW EXECUTE FUNCTION public.enforce_nurse_visit_amendment_rules();

CREATE OR REPLACE FUNCTION public.refresh_nurse_visit_content_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nurse_visit_forms
  SET content_hash = public.compute_nurse_visit_content_hash(NEW.form_id)
  WHERE id = NEW.form_id AND status = 'draft';
  RETURN NEW;
END;
$$;

CREATE TRIGGER refresh_nurse_visit_content_hash
AFTER INSERT ON public.nurse_visit_signatures
FOR EACH ROW EXECUTE FUNCTION public.refresh_nurse_visit_content_hash();

CREATE TRIGGER audit_nurse_visit_forms
AFTER INSERT OR UPDATE OR DELETE ON public.nurse_visit_forms
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_nurse_visit_signatures
AFTER INSERT ON public.nurse_visit_signatures
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ---------------------------------------------------------------------------
-- Workflow RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_nurse_visit_form(p_assessment_id uuid)
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
  v_client_name text;
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
  FROM public.nurse_visit_forms
  WHERE nurse_assessment_id = p_assessment_id AND status = 'draft'
  LIMIT 1;

  IF v_form_id IS NOT NULL THEN
    RETURN v_form_id;
  END IF;

  SELECT first_name || ' ' || last_name INTO v_client_name
  FROM public.clients WHERE id = a.client_id;

  INSERT INTO public.nurse_visit_forms (
    user_id, nurse_assessment_id, client_id, nurse_id, form_data
  ) VALUES (
    a.user_id, a.id, a.client_id, COALESCE(a.assigned_nurse_id, v_nurse_id),
    jsonb_build_object(
      'client_name', COALESCE(v_client_name, ''),
      'visit_date', to_char(COALESCE(a.scheduled_date, CURRENT_DATE), 'YYYY-MM-DD')
    )
  )
  RETURNING id INTO v_form_id;

  RETURN v_form_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_nurse_visit_form(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_nurse_visit_signature(
  p_form_id uuid,
  p_signature_slot text,
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
  f public.nurse_visit_forms;
  v_headers json;
  v_ip text;
  v_agent text;
  v_id uuid;
  is_admin boolean;
  v_problems text[];
BEGIN
  SELECT * INTO f FROM public.nurse_visit_forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form not found.' USING ERRCODE = 'no_data_found';
  END IF;

  is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  IF NOT is_admin AND f.nurse_id IS DISTINCT FROM public.current_nurse_id() THEN
    RAISE EXCEPTION 'This form is not assigned to you.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF f.status <> 'draft' THEN
    RAISE EXCEPTION 'This Nurse Visit form is already signed and locked.' USING ERRCODE = 'check_violation';
  END IF;

  IF btrim(COALESCE(p_signer_name, '')) = '' OR btrim(COALESCE(p_signature_data, '')) = '' THEN
    RAISE EXCEPTION 'A signer name and a signature are both required.' USING ERRCODE = 'check_violation';
  END IF;

  -- The form cannot be signed until every required field is filled in.
  v_problems := public.nurse_visit_form_problems(p_form_id);
  IF array_length(v_problems, 1) > 0 THEN
    RAISE EXCEPTION 'This form cannot be signed yet: %', array_to_string(v_problems, ' ')
      USING ERRCODE = 'check_violation';
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

  INSERT INTO public.nurse_visit_signatures (
    form_id, user_id, signature_slot, signer_type, signer_name, signer_relationship,
    signer_role_description, signer_user_id, captured_by_user_id,
    signature_data, attestation_text, ip_address, user_agent, content_snapshot
  ) VALUES (
    f.id, f.user_id, p_signature_slot, p_signer_type, btrim(p_signer_name), p_relationship,
    p_role_description,
    CASE WHEN p_signer_type = 'nurse' THEN auth.uid() ELSE NULL END,
    auth.uid(),
    p_signature_data, p_attestation_text, v_ip, v_agent, f.form_data
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_nurse_visit_signature(uuid, text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_nurse_visit_form(p_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.nurse_visit_forms;
  is_admin boolean;
  v_problems text[];
BEGIN
  SELECT * INTO f FROM public.nurse_visit_forms WHERE id = p_form_id;
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

  v_problems := public.nurse_visit_form_problems(p_form_id);
  IF array_length(v_problems, 1) > 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'fields_incomplete',
      'problems', to_jsonb(v_problems));
  END IF;

  IF NOT public.nurse_visit_signatures_complete(p_form_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'signatures_incomplete');
  END IF;

  UPDATE public.nurse_visit_forms
  SET status = 'signed', signed_at = now()
  WHERE id = p_form_id;

  IF f.amends_form_id IS NOT NULL THEN
    UPDATE public.nurse_visit_forms
    SET status = 'amended'
    WHERE id = f.amends_form_id AND status = 'signed';
  END IF;

  UPDATE public.nurse_assessments
  SET status = 'Completed', completed_at = COALESCE(completed_at, now())
  WHERE id = f.nurse_assessment_id AND f.amends_form_id IS NULL;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_nurse_visit_form(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.nurse_visit_form_problems(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.nurse_visit_signatures_complete(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_nurse_visit_content_hash(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.nurse_visit_form_problems(uuid) TO authenticated;
