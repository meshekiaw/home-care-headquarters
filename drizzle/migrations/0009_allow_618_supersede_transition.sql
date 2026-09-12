-- A signed form stays immutable, with one exception: it may be marked as
-- superseded ('amended') when a correction is signed. Nothing else may change.
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

  IF OLD.status <> 'draft' THEN
    IF OLD.status = 'signed' AND NEW.status = 'amended'
       AND NEW.form_data = OLD.form_data
       AND NEW.version = OLD.version
       AND NEW.content_hash IS NOT DISTINCT FROM OLD.content_hash
       AND NEW.signed_at IS NOT DISTINCT FROM OLD.signed_at
       AND NEW.client_signature_status = OLD.client_signature_status
       AND NEW.client_signature_exception_reason IS NOT DISTINCT FROM OLD.client_signature_exception_reason THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'This 618 assessment was signed on % and can no longer be changed. Add a correction (amendment) instead.',
      to_char(OLD.signed_at, 'MM/DD/YYYY') USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'signed' AND NOT public.form_618_signatures_complete(NEW.id) THEN
    RAISE EXCEPTION 'All required signatures must be captured before the 618 assessment can be completed.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'signed' AND NEW.signed_at IS NULL THEN
    NEW.signed_at := now();
  END IF;

  NEW.updated_at := now();
  NEW.content_hash := public.compute_618_content_hash(NEW.id);

  RETURN NEW;
END;
$$;