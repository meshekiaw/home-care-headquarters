ALTER TABLE public.nurse_assessments
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_scheduled_date date,
  ADD COLUMN IF NOT EXISTS previous_scheduled_time time without time zone;

ALTER TABLE public.nurse_assessments
  DROP CONSTRAINT IF EXISTS nurse_assessments_claimed_requires_schedule;

ALTER TABLE public.nurse_assessments
  ADD CONSTRAINT nurse_assessments_claimed_requires_schedule
  CHECK (
    assigned_nurse_id IS NULL
    OR status NOT IN ('Claimed', 'Completed')
    OR (scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.sync_nurse_assessment_due_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exp date;
BEGIN
  IF NEW.assessment_type = '618' THEN
    SELECT form_618_expiration_date INTO v_exp FROM public.clients WHERE id = NEW.client_id;
    IF v_exp IS NOT NULL THEN
      NEW.due_date := v_exp;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_nurse_assessment_due_date ON public.nurse_assessments;
CREATE TRIGGER trg_sync_nurse_assessment_due_date
BEFORE INSERT OR UPDATE OF client_id, assessment_type, due_date ON public.nurse_assessments
FOR EACH ROW EXECUTE FUNCTION public.sync_nurse_assessment_due_date();

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
    SET due_date = NEW.form_618_expiration_date
    WHERE client_id = NEW.id
      AND assessment_type = '618'
      AND status <> 'Completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_assessments_on_client_618_change ON public.clients;
CREATE TRIGGER trg_sync_assessments_on_client_618_change
AFTER UPDATE OF form_618_expiration_date ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.sync_assessments_on_client_618_change();

CREATE OR REPLACE FUNCTION public.claim_nurse_assessment(p_assessment_id uuid, p_scheduled_date date, p_scheduled_time time without time zone)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nurse_id uuid;
  v_row public.nurse_assessments;
  v_nurse_name text;
BEGIN
  v_nurse_id := public.current_nurse_id();
  IF v_nurse_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_a_nurse');
  END IF;

  IF p_scheduled_date IS NULL OR p_scheduled_time IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'schedule_required');
  END IF;

  SELECT * INTO v_row FROM public.nurse_assessments
  WHERE id = p_assessment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_row.assigned_nurse_id IS NOT NULL THEN
    SELECT first_name || ' ' || last_name INTO v_nurse_name
    FROM public.nurses WHERE id = v_row.assigned_nurse_id;
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'already_claimed',
      'nurse_name', coalesce(v_nurse_name, 'another nurse'),
      'scheduled_date', v_row.scheduled_date,
      'scheduled_time', v_row.scheduled_time
    );
  END IF;

  UPDATE public.nurse_assessments
  SET assigned_nurse_id = v_nurse_id,
      scheduled_date = p_scheduled_date,
      scheduled_time = p_scheduled_time,
      claimed_at = now(),
      status = 'Claimed'
  WHERE id = p_assessment_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reschedule_nurse_assessment(
  p_assessment_id uuid,
  p_scheduled_date date,
  p_scheduled_time time without time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nurse_id uuid;
  v_row public.nurse_assessments;
  v_changed boolean;
BEGIN
  v_nurse_id := public.current_nurse_id();
  IF v_nurse_id IS NULL OR NOT public.has_role(auth.uid(), 'nurse'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_a_nurse');
  END IF;

  IF p_scheduled_date IS NULL OR p_scheduled_time IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'schedule_required');
  END IF;

  SELECT * INTO v_row FROM public.nurse_assessments
  WHERE id = p_assessment_id AND assigned_nurse_id = v_nurse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_yours');
  END IF;

  v_changed := v_row.scheduled_date IS NOT NULL
    AND (v_row.scheduled_date, v_row.scheduled_time) IS DISTINCT FROM (p_scheduled_date, p_scheduled_time);

  UPDATE public.nurse_assessments
  SET scheduled_date = p_scheduled_date,
      scheduled_time = p_scheduled_time,
      previous_scheduled_date = CASE WHEN v_changed THEN v_row.scheduled_date ELSE previous_scheduled_date END,
      previous_scheduled_time = CASE WHEN v_changed THEN v_row.scheduled_time ELSE previous_scheduled_time END,
      rescheduled_at = CASE WHEN v_changed THEN now() ELSE rescheduled_at END,
      reschedule_count = CASE WHEN v_changed THEN reschedule_count + 1 ELSE reschedule_count END
  WHERE id = p_assessment_id;

  RETURN jsonb_build_object('success', true, 'rescheduled', v_changed);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reschedule_nurse_assessment(uuid, date, time without time zone) TO authenticated;

DROP FUNCTION IF EXISTS public.nurse_assessment_detail(uuid);
CREATE OR REPLACE FUNCTION public.nurse_assessment_detail(p_assessment_id uuid)
RETURNS TABLE(id uuid, assessment_type text, due_date date, status text, scheduled_date date, scheduled_time time without time zone, notes text, client_name text, form_618_expiration_date date, is_mine boolean, claimed_by_name text, rescheduled_at timestamptz, reschedule_count integer, previous_scheduled_date date, previous_scheduled_time time without time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.assessment_type, a.due_date, a.status, a.scheduled_date, a.scheduled_time, a.notes,
         c.first_name || ' ' || c.last_name,
         c.form_618_expiration_date,
         a.assigned_nurse_id IS NOT NULL AND a.assigned_nurse_id = public.current_nurse_id(),
         n.first_name || ' ' || n.last_name,
         a.rescheduled_at, a.reschedule_count, a.previous_scheduled_date, a.previous_scheduled_time
  FROM public.nurse_assessments a
  JOIN public.clients c ON c.id = a.client_id
  LEFT JOIN public.nurses n ON n.id = a.assigned_nurse_id
  WHERE a.id = p_assessment_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        public.has_role(auth.uid(), 'nurse'::app_role)
        AND public.current_nurse_id() IS NOT NULL
        AND (
          a.assigned_nurse_id = public.current_nurse_id()
          OR (a.assigned_nurse_id IS NULL AND a.status = 'Pending')
        )
      )
    )
$function$;