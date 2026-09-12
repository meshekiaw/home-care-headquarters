-- Payer type on clients: Medicaid (default) or VA
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS payer_type text NOT NULL DEFAULT 'Medicaid';

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_payer_type_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_payer_type_check CHECK (payer_type IN ('Medicaid', 'VA'));

-- Backfill from existing client_class where it clearly says VA
UPDATE public.clients SET payer_type = 'VA' WHERE client_class = 'VA';

-- Completion of a 618 form now sets the client's 618 dates and completes the assessment
CREATE OR REPLACE FUNCTION public.complete_618_form(p_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.assessment_618_forms;
  is_admin boolean;
  v_completed_on date := (now() AT TIME ZONE 'UTC')::date;
  v_payer text;
  v_old_618 date;
  v_old_exp date;
  v_new_exp date;
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
    -- Amendment: supersede the earlier signed version, never touch the dates again
    UPDATE public.assessment_618_forms
    SET status = 'amended'
    WHERE id = f.amends_form_id AND status = 'signed';
  ELSE
    -- Original completion: set the client's 618 dates from the completion date
    SELECT payer_type, form_618_date, form_618_expiration_date
      INTO v_payer, v_old_618, v_old_exp
    FROM public.clients WHERE id = f.client_id FOR UPDATE;

    IF v_payer IS NOT NULL THEN
      -- Medicaid and VA both get one year from completion.
      -- (VA's additional six-month requirement is not implemented yet.)
      v_new_exp := v_completed_on + INTERVAL '1 year';

      UPDATE public.clients
      SET form_618_date = v_completed_on,
          form_618_expiration_date = v_new_exp,
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
          'form_618_expiration_date', v_old_exp
        ),
        jsonb_build_object(
          'form_618_date', v_completed_on,
          'form_618_expiration_date', v_new_exp,
          'payer_type', v_payer,
          'completed_by_user_id', auth.uid(),
          'nurse_assessment_id', f.nurse_assessment_id,
          'form_618_id', f.id,
          'form_version', f.version
        )
      );
    END IF;
  END IF;

  -- Mark the driving assessment Completed (schedule fields are required when a nurse is assigned)
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
    'payer_type', v_payer
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_618_form(uuid) TO authenticated;