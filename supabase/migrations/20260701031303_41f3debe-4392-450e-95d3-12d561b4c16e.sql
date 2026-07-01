
CREATE OR REPLACE FUNCTION public.enforce_caregiver_cleared_to_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_cleared boolean;
  cg_name text;
BEGIN
  IF NEW.caregiver_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.caregiver_id = OLD.caregiver_id THEN
    RETURN NEW;
  END IF;

  SELECT cleared_to_schedule, COALESCE(first_name || ' ' || last_name, 'caregiver')
    INTO is_cleared, cg_name
  FROM public.caregivers
  WHERE id = NEW.caregiver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caregiver % not found', NEW.caregiver_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF is_cleared IS NOT TRUE THEN
    RAISE EXCEPTION 'Caregiver % is not cleared to schedule. Complete orientation before assigning shifts.', cg_name
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_enforce_cleared ON public.appointments;
CREATE TRIGGER trg_appointments_enforce_cleared
BEFORE INSERT OR UPDATE OF caregiver_id ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.enforce_caregiver_cleared_to_schedule();
