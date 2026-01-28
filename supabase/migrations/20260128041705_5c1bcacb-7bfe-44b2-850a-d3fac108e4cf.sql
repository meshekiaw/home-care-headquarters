-- Add location fields to caregivers table
ALTER TABLE public.caregivers
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS service_radius_miles integer DEFAULT 25;

-- Add index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_caregivers_location ON public.caregivers (city, state, zip_code);
CREATE INDEX IF NOT EXISTS idx_clients_location ON public.clients (city, state, zip_code);