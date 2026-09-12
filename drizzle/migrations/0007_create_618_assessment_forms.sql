-- 618 assessment form records with multi-party signatures, draft/signed lifecycle,
-- database-level immutability after signing, and audit logging.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.assessment_618_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nurse_assessment_id uuid NOT NULL REFERENCES public.nurse_assessments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nurse_id uuid REFERENCES public.nurses(id),
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  amends_form_id uuid REFERENCES public.assessment_618_forms(id),
  amendment_reason text,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text,
  client_signature_status text NOT NULL DEFAULT 'pending',
  client_signature_exception_reason text,
  signed_at timestamptz,
  last_autosaved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_618_forms_status_check
    CHECK (status IN ('draft', 'signed', 'amended', 'voided')),
  CONSTRAINT assessment_618_forms_client_sig_status_check
    CHECK (client_signature_status IN (
      'pending', 'client_signed', 'representative_signed', 'witness_signed',
      'unable_physical', 'unable_cognitive', 'refused'
    ))
);

CREATE INDEX idx_618_forms_assessment ON public.assessment_618_forms(nurse_assessment_id);
CREATE INDEX idx_618_forms_client ON public.assessment_618_forms(client_id);
CREATE INDEX idx_618_forms_nurse ON public.assessment_618_forms(nurse_id);

-- Only one open draft per assessment version chain
CREATE UNIQUE INDEX idx_618_forms_one_draft_per_assessment
  ON public.assessment_618_forms(nurse_assessment_id)
  WHERE status = 'draft';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_618_forms TO authenticated;
GRANT ALL ON public.assessment_618_forms TO service_role;

ALTER TABLE public.assessment_618_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all 618 forms"
ON public.assessment_618_forms FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nurses view their own 618 forms"
ON public.assessment_618_forms FOR SELECT TO authenticated
USING (nurse_id = public.current_nurse_id());

CREATE POLICY "Nurses create their own 618 forms"
ON public.assessment_618_forms FOR INSERT TO authenticated
WITH CHECK (nurse_id = public.current_nurse_id());

CREATE POLICY "Nurses update their own 618 forms"
ON public.assessment_618_forms FOR UPDATE TO authenticated
USING (nurse_id = public.current_nurse_id())
WITH CHECK (nurse_id = public.current_nurse_id());

-- ---------------------------------------------------------------------------
-- Signatures: insert-only ledger, one row per signing party
-- ---------------------------------------------------------------------------
CREATE TABLE public.assessment_618_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.assessment_618_forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
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
  CONSTRAINT assessment_618_signatures_type_check
    CHECK (signer_type IN ('nurse', 'client', 'representative', 'witness'))
);

CREATE INDEX idx_618_signatures_form ON public.assessment_618_signatures(form_id);
CREATE UNIQUE INDEX idx_618_signatures_one_per_type
  ON public.assessment_618_signatures(form_id, signer_type);

GRANT SELECT, INSERT ON public.assessment_618_signatures TO authenticated;
GRANT ALL ON public.assessment_618_signatures TO service_role;

ALTER TABLE public.assessment_618_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all 618 signatures"
ON public.assessment_618_signatures FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nurses view signatures on their 618 forms"
ON public.assessment_618_signatures FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessment_618_forms f
  WHERE f.id = form_id AND f.nurse_id = public.current_nurse_id()
));

CREATE POLICY "Nurses and admins add signatures to 618 forms"
ON public.assessment_618_signatures FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.assessment_618_forms f
    WHERE f.id = form_id AND f.nurse_id = public.current_nurse_id()
  )
);

-- Signature rows can never be changed or removed (no UPDATE/DELETE policies,
-- plus a hard block so even privileged paths cannot rewrite history).
CREATE OR REPLACE FUNCTION public.block_618_signature_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Signatures on a 618 assessment are permanent and cannot be % .', lower(TG_OP)
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER block_618_signature_update
BEFORE UPDATE OR DELETE ON public.assessment_618_signatures
FOR EACH ROW EXECUTE FUNCTION public.block_618_signature_mutation();

-- ---------------------------------------------------------------------------
-- Fingerprint over the form content plus every signature on the document
-- ---------------------------------------------------------------------------
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
    COALESCE((
      SELECT string_agg(
        s.signer_type || ':' || s.signer_name || ':' ||
        COALESCE(s.signer_relationship, '') || ':' ||
        s.attestation_text || ':' ||
        to_char(s.signed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || ':' ||
        encode(digest(s.signature_data, 'sha256'), 'hex'),
        '||' ORDER BY s.signer_type, s.signed_at)
      FROM public.assessment_618_signatures s
      WHERE s.form_id = f.id
    ), '')
  INTO payload
  FROM public.assessment_618_forms f
  WHERE f.id = p_form_id;

  IF payload IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN encode(digest(payload, 'sha256'), 'hex');
END;
$$;

-- Are all required signatures present?
-- Nurse signature is always required. The client must sign unless a documented
-- exception is recorded, in which case a representative or witness must sign.
CREATE OR REPLACE FUNCTION public.form_618_signatures_complete(p_form_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.assessment_618_forms;
  has_nurse boolean;
  has_client boolean;
  has_rep boolean;
  has_witness boolean;
BEGIN
  SELECT * INTO f FROM public.assessment_618_forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT
    bool_or(signer_type = 'nurse'),
    bool_or(signer_type = 'client'),
    bool_or(signer_type = 'representative'),
    bool_or(signer_type = 'witness')
  INTO has_nurse, has_client, has_rep, has_witness
  FROM public.assessment_618_signatures WHERE form_id = p_form_id;

  IF COALESCE(has_nurse, false) IS NOT TRUE THEN
    RETURN false;
  END IF;

  IF f.client_signature_status IN ('unable_physical', 'unable_cognitive', 'refused') THEN
    RETURN COALESCE(NULLIF(btrim(COALESCE(f.client_signature_exception_reason, '')), ''), NULL) IS NOT NULL
      AND (COALESCE(has_rep, false) OR COALESCE(has_witness, false));
  END IF;

  RETURN COALESCE(has_client, false);
END;
$$;

-- ---------------------------------------------------------------------------
-- Lock signed forms; allow corrections only as a new amendment record
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_618_form_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'A signed 618 assessment cannot be deleted. Record a correction instead.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Nothing on a signed/amended/voided form may change.
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'This 618 assessment was signed on % and can no longer be changed. Add a correction (amendment) instead.',
        to_char(OLD.signed_at, 'MM/DD/YYYY') USING ERRCODE = 'check_violation';
    END IF;

    -- A draft may only become signed once every required signature exists.
    IF NEW.status = 'signed' AND NOT public.form_618_signatures_complete(NEW.id) THEN
      RAISE EXCEPTION 'All required signatures must be captured before the 618 assessment can be completed.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.status = 'signed' AND NEW.signed_at IS NULL THEN
      NEW.signed_at := now();
    END IF;

    NEW.updated_at := now();
    NEW.content_hash := public.compute_618_content_hash(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_618_form_lock
BEFORE UPDATE OR DELETE ON public.assessment_618_forms
FOR EACH ROW EXECUTE FUNCTION public.enforce_618_form_lock();

-- An amendment must state a reason and point at the record it corrects.
CREATE OR REPLACE FUNCTION public.enforce_618_amendment_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent public.assessment_618_forms;
BEGIN
  IF NEW.amends_form_id IS NOT NULL THEN
    IF btrim(COALESCE(NEW.amendment_reason, '')) = '' THEN
      RAISE EXCEPTION 'A correction to a 618 assessment must include a reason.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT * INTO parent FROM public.assessment_618_forms WHERE id = NEW.amends_form_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'The 618 assessment being corrected does not exist.'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    NEW.version := parent.version + 1;
    NEW.nurse_assessment_id := parent.nurse_assessment_id;
    NEW.client_id := parent.client_id;
  END IF;

  NEW.content_hash := public.compute_618_content_hash(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_618_amendment_rules
BEFORE INSERT ON public.assessment_618_forms
FOR EACH ROW EXECUTE FUNCTION public.enforce_618_amendment_rules();

-- Recompute the document fingerprint whenever a signature is added.
CREATE OR REPLACE FUNCTION public.refresh_618_content_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assessment_618_forms
  SET content_hash = public.compute_618_content_hash(NEW.form_id)
  WHERE id = NEW.form_id AND status = 'draft';
  RETURN NEW;
END;
$$;

CREATE TRIGGER refresh_618_content_hash
AFTER INSERT ON public.assessment_618_signatures
FOR EACH ROW EXECUTE FUNCTION public.refresh_618_content_hash();

-- Audit logging, same as the other client PHI tables
CREATE TRIGGER audit_assessment_618_forms
AFTER INSERT OR UPDATE OR DELETE ON public.assessment_618_forms
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_assessment_618_signatures
AFTER INSERT ON public.assessment_618_signatures
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();