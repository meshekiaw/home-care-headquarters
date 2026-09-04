ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS form_618_date date,
  ADD COLUMN IF NOT EXISTS form_618_expiration_date date,
  ADD COLUMN IF NOT EXISTS authorization_begin_date date;