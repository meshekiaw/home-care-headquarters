
CREATE TABLE public.caregiver_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  actor_id UUID,
  activity_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_caregiver_activity_log_caregiver ON public.caregiver_activity_log(caregiver_id, created_at DESC);
CREATE INDEX idx_caregiver_activity_log_type ON public.caregiver_activity_log(activity_type);

GRANT SELECT, INSERT ON public.caregiver_activity_log TO authenticated;
GRANT ALL ON public.caregiver_activity_log TO service_role;

ALTER TABLE public.caregiver_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all caregiver activity"
  ON public.caregiver_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers can view own activity"
  ON public.caregiver_activity_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.caregivers c WHERE c.id = caregiver_id AND c.user_id = auth.uid()));

CREATE POLICY "Authenticated can insert activity"
  ON public.caregiver_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (actor_id IS NULL OR actor_id = auth.uid());
