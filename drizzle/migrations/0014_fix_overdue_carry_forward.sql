-- Carry-forward should clear Overdue when the new due date is in the future
CREATE OR REPLACE FUNCTION public.sync_assessments_on_client_618_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.form_618_expiration_date IS DISTINCT FROM OLD.form_618_expiration_date
     AND NEW.form_618_expiration_date IS NOT NULL THEN
    UPDATE public.nurse_assessments
    SET due_date = NEW.form_618_expiration_date,
        status = CASE
          WHEN status = 'Overdue' AND NEW.form_618_expiration_date > (now() AT TIME ZONE 'UTC')::date
            THEN CASE WHEN assigned_nurse_id IS NOT NULL AND scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL
                      THEN 'Claimed' ELSE 'Pending' END
          ELSE status
        END,
        assigned_nurse_id = CASE
          WHEN status = 'Overdue' AND NEW.form_618_expiration_date > (now() AT TIME ZONE 'UTC')::date
               AND (scheduled_date IS NULL OR scheduled_time IS NULL)
            THEN NULL ELSE assigned_nurse_id END
    WHERE client_id = NEW.id
      AND assessment_type = '618'
      AND status <> 'Completed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_assessments_on_client_nurse_visit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nurse_visit_due_date IS DISTINCT FROM OLD.nurse_visit_due_date
     AND NEW.nurse_visit_due_date IS NOT NULL THEN
    UPDATE public.nurse_assessments
    SET due_date = NEW.nurse_visit_due_date,
        status = CASE
          WHEN status = 'Overdue' AND NEW.nurse_visit_due_date > (now() AT TIME ZONE 'UTC')::date
            THEN CASE WHEN assigned_nurse_id IS NOT NULL AND scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL
                      THEN 'Claimed' ELSE 'Pending' END
          ELSE status
        END,
        assigned_nurse_id = CASE
          WHEN status = 'Overdue' AND NEW.nurse_visit_due_date > (now() AT TIME ZONE 'UTC')::date
               AND (scheduled_date IS NULL OR scheduled_time IS NULL)
            THEN NULL ELSE assigned_nurse_id END
    WHERE client_id = NEW.id
      AND assessment_type = 'Nurse Visit'
      AND status <> 'Completed';
  END IF;
  RETURN NEW;
END;
$$;

-- Row-level guard: an assessment can never be Overdue with a future due date
CREATE OR REPLACE FUNCTION public.normalize_assessment_overdue_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Overdue' AND NEW.due_date > (now() AT TIME ZONE 'UTC')::date THEN
    IF NEW.assigned_nurse_id IS NOT NULL AND NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time IS NOT NULL THEN
      NEW.status := 'Claimed';
    ELSE
      NEW.status := 'Pending';
      NEW.assigned_nurse_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_assessment_overdue_status ON public.nurse_assessments;
CREATE TRIGGER trg_normalize_assessment_overdue_status
BEFORE INSERT OR UPDATE ON public.nurse_assessments
FOR EACH ROW EXECUTE FUNCTION public.normalize_assessment_overdue_status();

-- Repair existing rows where Overdue no longer matches the due date
UPDATE public.nurse_assessments
SET status = CASE WHEN assigned_nurse_id IS NOT NULL AND scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL
                  THEN 'Claimed' ELSE 'Pending' END,
    assigned_nurse_id = CASE WHEN scheduled_date IS NULL OR scheduled_time IS NULL THEN NULL ELSE assigned_nurse_id END
WHERE status = 'Overdue'
  AND due_date > (now() AT TIME ZONE 'UTC')::date;