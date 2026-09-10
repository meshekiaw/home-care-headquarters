ALTER TABLE public.caregivers
  ADD COLUMN IF NOT EXISTS background_check_date date,
  ADD COLUMN IF NOT EXISTS maltreatment_check_date date,
  ADD COLUMN IF NOT EXISTS maltreatment_expiration_date date,
  ADD COLUMN IF NOT EXISTS tmu_date date,
  ADD COLUMN IF NOT EXISTS tmu_expiration_date date,
  ADD COLUMN IF NOT EXISTS tb_test_date date,
  ADD COLUMN IF NOT EXISTS tb_test_expiration_date date,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS termination_date date;