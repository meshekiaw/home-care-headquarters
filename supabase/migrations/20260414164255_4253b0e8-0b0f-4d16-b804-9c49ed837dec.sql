
CREATE OR REPLACE FUNCTION public.encrypt_ssn_for_caregiver(p_caregiver_id uuid, p_ssn text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.caregivers
  SET ssn_encrypted = public.encrypt_ssn(p_ssn)
  WHERE id = p_caregiver_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_caregiver_ssn_masked(p_caregiver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  SELECT public.get_masked_ssn(ssn_encrypted) INTO result
  FROM public.caregivers
  WHERE id = p_caregiver_id;
  RETURN result;
END;
$$;
