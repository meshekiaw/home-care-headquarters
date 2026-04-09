
CREATE TABLE public.caregiver_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(caregiver_id)
);

ALTER TABLE public.caregiver_applications ENABLE ROW LEVEL SECURITY;

-- Admin access (owner of caregiver record)
CREATE POLICY "Admins can view caregiver applications"
ON public.caregiver_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create caregiver applications"
ON public.caregiver_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update caregiver applications"
ON public.caregiver_applications FOR UPDATE
USING (auth.uid() = user_id);

-- Caregiver access (via auth_user_id on caregivers table)
CREATE POLICY "Caregivers can view their own application"
ON public.caregiver_applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.caregivers
    WHERE caregivers.id = caregiver_applications.caregiver_id
    AND caregivers.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Caregivers can update their own application"
ON public.caregiver_applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.caregivers
    WHERE caregivers.id = caregiver_applications.caregiver_id
    AND caregivers.auth_user_id = auth.uid()
  )
);

CREATE TRIGGER update_caregiver_applications_updated_at
BEFORE UPDATE ON public.caregiver_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
