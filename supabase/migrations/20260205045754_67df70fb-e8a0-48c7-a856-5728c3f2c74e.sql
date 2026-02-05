-- Create nurses table
CREATE TABLE public.nurses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  license_number TEXT,
  license_state TEXT,
  license_expiry DATE,
  specializations TEXT[],
  hourly_rate NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create nurse_credentials table for storing all credentials
CREATE TABLE public.nurse_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nurse_id UUID NOT NULL REFERENCES public.nurses(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL, -- 'rn_license', 'bls_cpr', 'specialty_cert', 'tb_test', 'background_check'
  credential_name TEXT NOT NULL,
  credential_number TEXT,
  issuing_organization TEXT,
  issue_date DATE,
  expiry_date DATE,
  document_url TEXT, -- URL to uploaded file in storage
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on nurses
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nurses"
  ON public.nurses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nurses"
  ON public.nurses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nurses"
  ON public.nurses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nurses"
  ON public.nurses FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on nurse_credentials
ALTER TABLE public.nurse_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nurse credentials"
  ON public.nurse_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nurse credentials"
  ON public.nurse_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nurse credentials"
  ON public.nurse_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nurse credentials"
  ON public.nurse_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_nurses_updated_at
  BEFORE UPDATE ON public.nurses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nurse_credentials_updated_at
  BEFORE UPDATE ON public.nurse_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for nurse credential documents
INSERT INTO storage.buckets (id, name, public) VALUES ('nurse-credentials', 'nurse-credentials', false);

-- Storage policies for nurse credentials bucket
CREATE POLICY "Users can view their own nurse credential files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nurse-credentials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own nurse credential files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nurse-credentials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own nurse credential files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'nurse-credentials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own nurse credential files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'nurse-credentials' AND auth.uid()::text = (storage.foldername(name))[1]);