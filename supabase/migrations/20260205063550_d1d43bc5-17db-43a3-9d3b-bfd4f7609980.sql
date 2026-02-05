-- Add credential_expiry_alerts to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS credential_expiry_alerts boolean DEFAULT true;

-- Create agency_credentials table for agency-level licenses/certifications
CREATE TABLE public.agency_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_name TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  credential_number TEXT,
  issuing_organization TEXT,
  issue_date DATE,
  expiry_date DATE,
  document_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agency_credentials
CREATE POLICY "Users can view their own agency credentials"
ON public.agency_credentials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agency credentials"
ON public.agency_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agency credentials"
ON public.agency_credentials
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agency credentials"
ON public.agency_credentials
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_agency_credentials_updated_at
BEFORE UPDATE ON public.agency_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();