-- Multiple signature slots per 618 form (Sections IV, XI, XIII)

ALTER TABLE public.assessment_618_signatures
  ADD COLUMN IF NOT EXISTS signature_slot text;

ALTER TABLE public.assessment_618_forms
  ADD COLUMN IF NOT EXISTS client_signs_by_mark boolean NOT NULL DEFAULT false;

-- Backfill legacy rows onto the closest slot
UPDATE public.assessment_618_signatures
SET signature_slot = CASE
  WHEN signer_type = 'nurse' THEN 'sec11_nurse'
  WHEN signer_type = 'witness' THEN 'sec4_witness_1'
  ELSE 'sec4_client'
END
WHERE signature_slot IS NULL;

ALTER TABLE public.assessment_618_signatures
  DROP CONSTRAINT IF EXISTS assessment_618_signatures_type_check;

ALTER TABLE public.assessment_618_signatures
  ADD CONSTRAINT assessment_618_signatures_type_check
  CHECK (signer_type IN ('nurse', 'client', 'representative', 'witness', 'physician'));

ALTER TABLE public.assessment_618_signatures
  ADD CONSTRAINT assessment_618_signatures_slot_check
  CHECK (signature_slot IS NULL OR signature_slot IN (
    'sec4_client', 'sec4_witness_1', 'sec4_witness_2',
    'sec11_nurse', 'sec13_physician', 'sec13_client'
  ));

-- One signature per slot (replaces one-per-signer-type, so the same client can
-- sign both Section IV and Section XIII on one form)
DROP INDEX IF EXISTS idx_618_signatures_one_per_type;
CREATE UNIQUE INDEX idx_618_signatures_one_per_slot
  ON public.assessment_618_signatures(form_id, signature_slot);

-- Legacy inserts without a slot get one derived from the signer type
CREATE OR REPLACE FUNCTION public.default_618_signature_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.signature_slot IS NULL THEN
    NEW.signature_slot := CASE
      WHEN NEW.signer_type = 'nurse' THEN 'sec11_nurse'
      WHEN NEW.signer_type = 'physician' THEN 'sec13_physician'
      WHEN NEW.signer_type = 'witness' THEN 'sec4_witness_1'
      ELSE 'sec4_client'
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER default_618_signature_slot
BEFORE INSERT ON public.assessment_618_signatures
FOR EACH ROW EXECUTE FUNCTION public.default_618_signature_slot();

-- Fingerprint now covers the slot of every signature as well
CREATE OR REPLACE FUNCTION public.compute_618_content_hash(p_form_id uuid)
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
    f.client_signs_by_mark::text || '|' ||
    COALESCE((
      SELECT string_agg(
        COALESCE(s.signature_slot, '') || ':' ||
        s.signer_type || ':' || s.signer_name || ':' ||
        COALESCE(s.signer_relationship, '') || ':' ||
        COALESCE(s.signer_role_description, '') || ':' ||
        s.attestation_text || ':' ||
        to_char(s.signed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || ':' ||
        encode(sha256(convert_to(s.signature_data, 'UTF8')), 'hex'),
        '||' ORDER BY s.signature_slot, s.signed_at)
      FROM public.assessment_618_signatures s
      WHERE s.form_id = f.id
    ), '')
  INTO payload
  FROM public.assessment_618_forms f
  WHERE f.id = p_form_id;

  IF payload IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN encode(sha256(convert_to(payload, 'UTF8')), 'hex');
END;
$$;

-- Required slots: Section IV client/rep, Section XI nurse, Section XIII client/rep.
-- Both Section IV witnesses required when the client signs by mark.
-- Section XIII physician is always optional.
CREATE OR REPLACE FUNCTION public.form_618_signatures_complete(p_form_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.assessment_618_forms;
  v_exception boolean;
  v_slot text;
  v_type text;
BEGIN
  SELECT * INTO f FROM public.assessment_618_forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Section XI: registered nurse
  IF NOT EXISTS (
    SELECT 1 FROM public.assessment_618_signatures
    WHERE form_id = p_form_id AND signature_slot = 'sec11_nurse' AND signer_type = 'nurse'
  ) THEN
    RETURN false;
  END IF;

  v_exception := f.client_signature_status IN ('unable_physical', 'unable_cognitive', 'refused');

  IF v_exception AND btrim(COALESCE(f.client_signature_exception_reason, '')) = '' THEN
    RETURN false;
  END IF;

  -- Both client/representative slots
  FOREACH v_slot IN ARRAY ARRAY['sec4_client', 'sec13_client'] LOOP
    SELECT signer_type INTO v_type
    FROM public.assessment_618_signatures
    WHERE form_id = p_form_id AND signature_slot = v_slot
    LIMIT 1;

    IF v_type IS NULL THEN
      RETURN false;
    END IF;

    IF v_exception AND v_type NOT IN ('representative', 'witness') THEN
      RETURN false;
    END IF;

    IF NOT v_exception AND v_type NOT IN ('client', 'representative') THEN
      RETURN false;
    END IF;
  END LOOP;

  -- Signature by mark needs two Section IV witnesses
  IF f.client_signs_by_mark THEN
    IF (SELECT count(*) FROM public.assessment_618_signatures
        WHERE form_id = p_form_id
          AND signature_slot IN ('sec4_witness_1', 'sec4_witness_2')) < 2 THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Slot-aware signature capture
CREATE OR REPLACE FUNCTION public.add_618_signature(
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

  IF btrim(COALESCE(p_attestation_text, '')) = '' THEN
    RAISE EXCEPTION 'The exact statement the signer agreed to must be recorded.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_signature_slot NOT IN ('sec4_client','sec4_witness_1','sec4_witness_2','sec11_nurse','sec13_physician','sec13_client') THEN
    RAISE EXCEPTION 'Unknown signature slot: %', p_signature_slot USING ERRCODE = 'check_violation';
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

REVOKE ALL ON FUNCTION public.add_618_signature(uuid, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_618_signature(uuid, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.form_618_signatures_complete(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_618_content_hash(uuid) TO service_role;