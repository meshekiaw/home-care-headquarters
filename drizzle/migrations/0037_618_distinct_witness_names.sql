CREATE OR REPLACE FUNCTION public.enforce_618_distinct_witness_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.assessment_618_signatures first_witness
    JOIN public.assessment_618_signatures second_witness
      ON second_witness.form_id = first_witness.form_id
      AND second_witness.signature_slot = 'sec4_witness_2'
    WHERE first_witness.form_id = NEW.id
      AND first_witness.signature_slot = 'sec4_witness_1'
      AND lower(btrim(regexp_replace(first_witness.signer_name, '[[:space:]]+', ' ', 'g')))
        = lower(btrim(regexp_replace(second_witness.signer_name, '[[:space:]]+', ' ', 'g')))
  ) THEN
    RAISE EXCEPTION 'The two witnesses must be different people.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_618_distinct_witness_names() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_618_distinct_witness_names() TO service_role;

CREATE TRIGGER enforce_618_distinct_witness_names
BEFORE UPDATE OF status ON public.assessment_618_forms
FOR EACH ROW
WHEN (OLD.status = 'draft' AND NEW.status = 'signed')
EXECUTE FUNCTION public.enforce_618_distinct_witness_names();