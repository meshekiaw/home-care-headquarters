ALTER TABLE public.caregivers
  ADD COLUMN IF NOT EXISTS cleared_to_schedule boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_shift_at timestamptz,
  ADD COLUMN IF NOT EXISTS orientation_deadline timestamptz;