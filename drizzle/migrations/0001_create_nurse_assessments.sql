-- 1. Nurse flag for 618 assessment notifications
ALTER TABLE public.nurses
  ADD COLUMN IF NOT EXISTS receives_618_notifications boolean NOT NULL DEFAULT false;

-- 2. Nurse assessment records (separate from appointments/EVV/payroll)
CREATE TABLE public.nurse_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assessment_type text NOT NULL DEFAULT '618',
  due_date date NOT NULL,
  assigned_nurse_id uuid REFERENCES public.nurses(id) ON DELETE SET NULL,
  scheduled_date date,
  scheduled_time time,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Claimed','Completed','Overdue')),
  claimed_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_notification_sent_at timestamptz,
  reminder_14_sent_at timestamptz,
  reminder_7_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX nurse_assessments_unique_open
  ON public.nurse_assessments (client_id, assessment_type, due_date);

CREATE INDEX nurse_assessments_status_idx ON public.nurse_assessments (status, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nurse_assessments TO authenticated;
GRANT ALL ON public.nurse_assessments TO service_role;

ALTER TABLE public.nurse_assessments ENABLE ROW LEVEL SECURITY;

-- Helper: map the signed-in user's email to a nurse record
CREATE OR REPLACE FUNCTION public.current_nurse_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.nurses
  WHERE email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ORDER BY created_at
  LIMIT 1
$$;

CREATE POLICY "Admins manage all nurse assessments"
ON public.nurse_assessments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nurses view nurse assessments"
ON public.nurse_assessments FOR SELECT TO authenticated
USING (public.current_nurse_id() IS NOT NULL);

CREATE TRIGGER nurse_assessments_updated_at
BEFORE UPDATE ON public.nurse_assessments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Race-safe claim
CREATE OR REPLACE FUNCTION public.claim_nurse_assessment(
  p_assessment_id uuid,
  p_scheduled_date date,
  p_scheduled_time time
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nurse_id uuid;
  v_row public.nurse_assessments;
  v_nurse_name text;
BEGIN
  v_nurse_id := public.current_nurse_id();
  IF v_nurse_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_a_nurse');
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
$$;

GRANT EXECUTE ON FUNCTION public.claim_nurse_assessment(uuid, date, time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_nurse_id() TO authenticated;