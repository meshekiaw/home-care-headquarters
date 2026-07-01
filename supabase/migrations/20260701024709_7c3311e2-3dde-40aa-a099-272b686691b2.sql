ALTER TABLE public.client_assessments
  ADD COLUMN IF NOT EXISTS assessment_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS family_name text,
  ADD COLUMN IF NOT EXISTS family_phone text,
  ADD COLUMN IF NOT EXISTS family_email text;