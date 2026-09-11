-- Restrict nurse visibility on assessments: own assessments + unclaimed Pending only
DROP POLICY IF EXISTS "Nurses view nurse assessments" ON public.nurse_assessments;

CREATE POLICY "Nurses view own or unclaimed assessments"
ON public.nurse_assessments FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'nurse'::app_role)
  AND public.current_nurse_id() IS NOT NULL
  AND (
    assigned_nurse_id = public.current_nurse_id()
    OR (assigned_nurse_id IS NULL AND status = 'Pending')
  )
);

CREATE POLICY "Nurses update their own assessments"
ON public.nurse_assessments FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'nurse'::app_role)
  AND assigned_nurse_id = public.current_nurse_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'nurse'::app_role)
  AND assigned_nurse_id = public.current_nurse_id()
);

GRANT SELECT, UPDATE ON public.nurse_assessments TO authenticated;
GRANT ALL ON public.nurse_assessments TO service_role;

-- Minimal, PHI-limited assessment list for the signed-in nurse
CREATE OR REPLACE FUNCTION public.nurse_visible_assessments()
RETURNS TABLE (
  id uuid,
  assessment_type text,
  due_date date,
  status text,
  scheduled_date date,
  scheduled_time time without time zone,
  notes text,
  client_name text,
  form_618_expiration_date date,
  is_mine boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.assessment_type, a.due_date, a.status, a.scheduled_date, a.scheduled_time, a.notes,
         c.first_name || ' ' || c.last_name,
         c.form_618_expiration_date,
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
$$;

-- Single assessment detail: nurses (own/unclaimed) and admins
CREATE OR REPLACE FUNCTION public.nurse_assessment_detail(p_assessment_id uuid)
RETURNS TABLE (
  id uuid,
  assessment_type text,
  due_date date,
  status text,
  scheduled_date date,
  scheduled_time time without time zone,
  notes text,
  client_name text,
  form_618_expiration_date date,
  is_mine boolean,
  claimed_by_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.assessment_type, a.due_date, a.status, a.scheduled_date, a.scheduled_time, a.notes,
         c.first_name || ' ' || c.last_name,
         c.form_618_expiration_date,
         a.assigned_nurse_id IS NOT NULL AND a.assigned_nurse_id = public.current_nurse_id(),
         n.first_name || ' ' || n.last_name
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
$$;

-- Nurses complete their own assessment and record notes
CREATE OR REPLACE FUNCTION public.complete_nurse_assessment(p_assessment_id uuid, p_notes text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nurse_id uuid;
BEGIN
  v_nurse_id := public.current_nurse_id();
  IF v_nurse_id IS NULL OR NOT public.has_role(auth.uid(), 'nurse'::app_role) THEN
    RETURN false;
  END IF;

  UPDATE public.nurse_assessments
  SET status = 'Completed',
      completed_at = now(),
      notes = COALESCE(NULLIF(p_notes, ''), notes)
  WHERE id = p_assessment_id
    AND assigned_nurse_id = v_nurse_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nurse_visible_assessments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.nurse_assessment_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_nurse_assessment(uuid, text) TO authenticated;