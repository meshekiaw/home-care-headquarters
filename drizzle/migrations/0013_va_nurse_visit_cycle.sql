-- 1. Nurse Visit due date on the client record
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS nurse_visit_due_date date;

-- 2. Allowed assessment types
ALTER TABLE public.nurse_assessments
  DROP CONSTRAINT IF EXISTS nurse_assessments_type_check;
ALTER TABLE public.nurse_assessments
  ADD CONSTRAINT nurse_assessments_type_check
  CHECK (assessment_type IN ('618', 'Nurse Visit'));

-- 3. Due-date sync: 618 follows the 618 expiration, Nurse Visit follows the nurse visit due date
CREATE OR REPLACE FUNCTION public.sync_nurse_assessment_due_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exp date;
  v_nv date;
BEGIN
  IF NEW.assessment_type = '618' THEN
    SELECT form_618_expiration_date INTO v_exp FROM public.clients WHERE id = NEW.client_id;
    IF v_exp IS NOT NULL THEN
      NEW.due_date := v_exp;
    END IF;
  ELSIF NEW.assessment_type = 'Nurse Visit' THEN
    SELECT nurse_visit_due_date INTO v_nv FROM public.clients WHERE id = NEW.client_id;
    IF v_nv IS NOT NULL THEN
      NEW.due_date := v_nv;
    END IF;
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
    SET due_date = NEW.nurse_visit_due_date
    WHERE client_id = NEW.id
      AND assessment_type = 'Nurse Visit'
      AND status <> 'Completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_assessments_on_client_nurse_visit_change ON public.clients;
CREATE TRIGGER trg_sync_assessments_on_client_nurse_visit_change
AFTER UPDATE OF nurse_visit_due_date ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.sync_assessments_on_client_nurse_visit_change();

-- 4. Completion of an original 618 sets the VA nurse visit due date six months out
CREATE OR REPLACE FUNCTION public.complete_618_form(p_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  f public.assessment_618_forms;
  is_admin boolean;
  v_completed_on date := (now() AT TIME ZONE 'UTC')::date;
  v_payer text;
  v_old_618 date;
  v_old_exp date;
  v_new_exp date;
  v_old_nv date;
  v_new_nv date;
  v_expiration_set boolean := false;
BEGIN
  SELECT * INTO f FROM public.assessment_618_forms WHERE id = p_form_id;
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

  IF NOT public.form_618_signatures_complete(p_form_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'signatures_incomplete');
  END IF;

  UPDATE public.assessment_618_forms
  SET status = 'signed', signed_at = now()
  WHERE id = p_form_id;

  IF f.amends_form_id IS NOT NULL THEN
    UPDATE public.assessment_618_forms
    SET status = 'amended'
    WHERE id = f.amends_form_id AND status = 'signed';
  ELSE
    SELECT payer_type, form_618_date, form_618_expiration_date, nurse_visit_due_date
      INTO v_payer, v_old_618, v_old_exp, v_old_nv
    FROM public.clients WHERE id = f.client_id FOR UPDATE;

    IF v_payer IS NOT NULL THEN
      v_new_exp := v_completed_on + INTERVAL '1 year';
      IF v_payer = 'VA' THEN
        v_new_nv := v_completed_on + INTERVAL '6 months';
      ELSE
        v_new_nv := v_old_nv;
      END IF;

      UPDATE public.clients
      SET form_618_date = v_completed_on,
          form_618_expiration_date = v_new_exp,
          nurse_visit_due_date = v_new_nv,
          updated_at = now()
      WHERE id = f.client_id;

      v_expiration_set := true;

      INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
      VALUES (
        auth.uid(),
        '618_completion_expiration_update',
        'clients',
        f.client_id::text,
        jsonb_build_object(
          'form_618_date', v_old_618,
          'form_618_expiration_date', v_old_exp,
          'nurse_visit_due_date', v_old_nv
        ),
        jsonb_build_object(
          'form_618_date', v_completed_on,
          'form_618_expiration_date', v_new_exp,
          'nurse_visit_due_date', v_new_nv,
          'payer_type', v_payer,
          'completed_by_user_id', auth.uid(),
          'nurse_assessment_id', f.nurse_assessment_id,
          'form_618_id', f.id,
          'form_version', f.version
        )
      );
    END IF;
  END IF;

  UPDATE public.nurse_assessments
  SET status = 'Completed',
      completed_at = COALESCE(completed_at, now()),
      scheduled_date = CASE WHEN assigned_nurse_id IS NOT NULL THEN COALESCE(scheduled_date, v_completed_on) ELSE scheduled_date END,
      scheduled_time = CASE WHEN assigned_nurse_id IS NOT NULL THEN COALESCE(scheduled_time, (now() AT TIME ZONE 'UTC')::time) ELSE scheduled_time END
  WHERE id = f.nurse_assessment_id
    AND status <> 'Completed';

  RETURN jsonb_build_object(
    'success', true,
    'expiration_set', v_expiration_set,
    'form_618_expiration_date', v_new_exp,
    'nurse_visit_due_date', v_new_nv,
    'payer_type', v_payer
  );
END;
$function$;

-- 5. Nurse-facing views expose the assessment's own due date already; add nurse visit date for context
DROP FUNCTION IF EXISTS public.nurse_visible_assessments();
CREATE OR REPLACE FUNCTION public.nurse_visible_assessments()
RETURNS TABLE(id uuid, assessment_type text, due_date date, status text, scheduled_date date, scheduled_time time without time zone, notes text, client_name text, form_618_expiration_date date, is_mine boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.assessment_type, a.due_date, a.status, a.scheduled_date, a.scheduled_time, a.notes,
         c.first_name || ' ' || c.last_name,
         CASE WHEN a.assessment_type = 'Nurse Visit' THEN c.nurse_visit_due_date ELSE c.form_618_expiration_date END,
         a.assigned_nurse_id = public.current_nurse_id()
  FROM public.nurse_assessments a
  JOIN public.clients c ON c.id = a.client_id
  WHERE public.has_role(auth.uid(), 'nurse'::app_role)
    AND public.current_nurse_id() IS NOT NULL
    AND (
      a.assigned_nurse_id = public.current_nurse_id()
      OR (a.assigned_nurse_id IS NULL AND a.status = 'Pending')
    )
  ORDER BY a.due_date
$function$;

DROP FUNCTION IF EXISTS public.nurse_assessment_detail(uuid);
CREATE OR REPLACE FUNCTION public.nurse_assessment_detail(p_assessment_id uuid)
RETURNS TABLE(id uuid, assessment_type text, due_date date, status text, scheduled_date date, scheduled_time time without time zone, notes text, client_name text, form_618_expiration_date date, is_mine boolean, claimed_by_name text, rescheduled_at timestamptz, reschedule_count integer, previous_scheduled_date date, previous_scheduled_time time without time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.assessment_type, a.due_date, a.status, a.scheduled_date, a.scheduled_time, a.notes,
         c.first_name || ' ' || c.last_name,
         CASE WHEN a.assessment_type = 'Nurse Visit' THEN c.nurse_visit_due_date ELSE c.form_618_expiration_date END,
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

GRANT EXECUTE ON FUNCTION public.nurse_visible_assessments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.nurse_assessment_detail(uuid) TO authenticated;
