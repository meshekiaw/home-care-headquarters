-- Allow a draft Nurse Visit form to be reset back to empty.
-- Signatures stay insert-only for everyone except this explicit reset path,
-- which is gated to drafts and recorded in the audit log.

CREATE OR REPLACE FUNCTION public.block_nurse_visit_signature_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND COALESCE(current_setting('app.nurse_visit_draft_reset', true), '') = 'on'
     AND EXISTS (
       SELECT 1 FROM public.nurse_visit_forms f
       WHERE f.id = OLD.form_id AND f.status = 'draft'
     ) THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Signatures on a Nurse Visit form are permanent and cannot be % .', lower(TG_OP)
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_nurse_visit_form(p_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.nurse_visit_forms;
  removed integer := 0;
BEGIN
  SELECT * INTO f FROM public.nurse_visit_forms WHERE id = p_form_id;
  IF f.id IS NULL THEN
    RAISE EXCEPTION 'The form could not be found.' USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR f.nurse_id = public.current_nurse_id()
  ) THEN
    RAISE EXCEPTION 'You do not have access to this Nurse Visit form.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF f.status <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft Nurse Visit form can be cleared. This form was already completed.'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('app.nurse_visit_draft_reset', 'on', true);
  DELETE FROM public.nurse_visit_signatures WHERE form_id = p_form_id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  PERFORM set_config('app.nurse_visit_draft_reset', 'off', true);

  UPDATE public.nurse_visit_forms
  SET form_data = '{}'::jsonb,
      client_signature_status = 'pending',
      client_signature_exception_reason = NULL,
      content_hash = NULL,
      last_autosaved_at = NULL,
      updated_at = now()
  WHERE id = p_form_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    'RESET_DRAFT',
    'nurse_visit_forms',
    p_form_id::text,
    jsonb_build_object(
      'form_data', f.form_data,
      'client_signature_status', f.client_signature_status,
      'client_signature_exception_reason', f.client_signature_exception_reason,
      'signatures_removed', removed
    ),
    jsonb_build_object('form_data', '{}'::jsonb, 'client_signature_status', 'pending')
  );

  RETURN jsonb_build_object('success', true, 'signatures_removed', removed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_nurse_visit_form(uuid) TO authenticated;