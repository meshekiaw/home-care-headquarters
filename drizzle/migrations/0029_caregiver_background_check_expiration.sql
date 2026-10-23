ALTER TABLE public.caregivers
ADD COLUMN background_check_expiration_date date
GENERATED ALWAYS AS ((background_check_date + interval '5 years')::date) STORED;

COMMENT ON COLUMN public.caregivers.background_check_expiration_date IS 'Automatically calculated five calendar years after background_check_date; blank when the check date is blank; cannot be manually written.';