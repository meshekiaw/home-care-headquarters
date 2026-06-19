
ALTER TABLE public.lms_assignments
  ADD COLUMN IF NOT EXISTS progress_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS certificate_url text,
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;

ALTER TABLE public.caregivers
  ADD COLUMN IF NOT EXISTS temp_password_sent_at timestamptz;

DROP POLICY IF EXISTS "Caregivers view own assignments" ON public.lms_assignments;
CREATE POLICY "Caregivers view own assignments"
  ON public.lms_assignments FOR SELECT
  TO authenticated
  USING (caregiver_id IN (SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Caregivers update own assignments" ON public.lms_assignments;
CREATE POLICY "Caregivers update own assignments"
  ON public.lms_assignments FOR UPDATE
  TO authenticated
  USING (caregiver_id IN (SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid()))
  WITH CHECK (caregiver_id IN (SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Caregivers view assigned courses" ON public.lms_courses;
CREATE POLICY "Caregivers view assigned courses"
  ON public.lms_courses FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT course_id FROM public.lms_assignments
      WHERE caregiver_id IN (SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid())
    )
  );
