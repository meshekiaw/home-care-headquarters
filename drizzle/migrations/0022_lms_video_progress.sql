CREATE TABLE public.lms_video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignment_id uuid NOT NULL REFERENCES public.lms_assignments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  watched_seconds numeric NOT NULL DEFAULT 0,
  duration_seconds numeric NOT NULL DEFAULT 0,
  percent_complete integer NOT NULL DEFAULT 0,
  last_position_seconds numeric NOT NULL DEFAULT 0,
  video_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id)
);

GRANT SELECT, INSERT, UPDATE ON public.lms_video_progress TO authenticated;
GRANT ALL ON public.lms_video_progress TO service_role;

ALTER TABLE public.lms_video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers view own video progress"
ON public.lms_video_progress FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.caregivers c WHERE c.id = lms_video_progress.caregiver_id AND c.auth_user_id = auth.uid())
);

CREATE POLICY "Caregivers insert own video progress"
ON public.lms_video_progress FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.caregivers c WHERE c.id = lms_video_progress.caregiver_id AND c.auth_user_id = auth.uid())
);

CREATE POLICY "Caregivers update own video progress"
ON public.lms_video_progress FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.caregivers c WHERE c.id = lms_video_progress.caregiver_id AND c.auth_user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.caregivers c WHERE c.id = lms_video_progress.caregiver_id AND c.auth_user_id = auth.uid())
);

CREATE TRIGGER lms_video_progress_updated_at
BEFORE UPDATE ON public.lms_video_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lms_video_progress_caregiver ON public.lms_video_progress(caregiver_id);
