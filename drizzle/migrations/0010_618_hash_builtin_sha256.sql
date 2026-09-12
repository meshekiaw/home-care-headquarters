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
        encode(sha256(convert_to(s.signature_data, 'UTF8')), 'hex'),
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

  RETURN encode(sha256(convert_to(payload, 'UTF8')), 'hex');
END;
$$;