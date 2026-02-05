-- Form Templates table (pre-built and custom forms)
CREATE TABLE public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'custom', -- 'pre-built', 'custom', 'uploaded'
  category TEXT DEFAULT 'admission', -- 'admission', 'consent', 'medical', 'legal'
  fields JSONB NOT NULL DEFAULT '[]', -- Array of field definitions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Form Submissions (filled out forms)
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}', -- Filled form values
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_signatures', 'partially_signed', 'completed', 'expired'
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Signature Requests (for multi-party signing)
CREATE TABLE public.form_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL, -- 'client', 'caregiver', 'agency_rep', 'guardian'
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_id UUID, -- Reference to client/caregiver if applicable
  signature_data TEXT, -- Base64 signature image or drawn signature
  signed_at TIMESTAMP WITH TIME ZONE,
  signing_method TEXT, -- 'in_app', 'email_link'
  token TEXT UNIQUE, -- For email-based signing
  token_expires_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'signed', 'declined', 'expired'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_templates
CREATE POLICY "Users can view their own form templates"
  ON public.form_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own form templates"
  ON public.form_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form templates"
  ON public.form_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own form templates"
  ON public.form_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for form_submissions
CREATE POLICY "Users can view their own form submissions"
  ON public.form_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own form submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form submissions"
  ON public.form_submissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own form submissions"
  ON public.form_submissions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for form_signatures
CREATE POLICY "Users can view their own form signatures"
  ON public.form_signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own form signatures"
  ON public.form_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form signatures"
  ON public.form_signatures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own form signatures"
  ON public.form_signatures FOR DELETE
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();