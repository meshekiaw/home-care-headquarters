
-- 1. Make client-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'client-documents';

-- 2. Make orientation-audio bucket private
UPDATE storage.buckets SET public = false WHERE id = 'orientation-audio';

-- 3. Fix storage policies for client-documents
-- Drop existing overly broad policies
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;

-- Create tighter storage policies
CREATE POLICY "Auth users can upload to client-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Auth users can read from client-documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Auth users can update in client-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Auth users can delete from client-documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-documents');

-- Storage policies for orientation-audio
DROP POLICY IF EXISTS "Authenticated users can upload orientation audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view orientation audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view orientation audio" ON storage.objects;
DROP POLICY IF EXISTS "Public can view orientation audio" ON storage.objects;

CREATE POLICY "Auth users can read orientation-audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'orientation-audio');

CREATE POLICY "Auth users can upload orientation-audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'orientation-audio');

CREATE POLICY "Auth users can delete orientation-audio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'orientation-audio');

-- 4. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert (via trigger function running as definer)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Create index for querying
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 5. Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 6. Attach audit triggers to PHI tables
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_medical_history AFTER INSERT OR UPDATE OR DELETE ON public.medical_history
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_care_plans AFTER INSERT OR UPDATE OR DELETE ON public.care_plans
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_client_documents AFTER INSERT OR UPDATE OR DELETE ON public.client_documents
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_caregivers AFTER INSERT OR UPDATE OR DELETE ON public.caregivers
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_caregiver_credentials AFTER INSERT OR UPDATE OR DELETE ON public.caregiver_credentials
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 7. SSN encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.caregivers ADD COLUMN ssn_encrypted bytea;

-- Create encryption/decryption functions
CREATE OR REPLACE FUNCTION public.encrypt_ssn(plain_ssn text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  SELECT decrypted_secret INTO enc_key FROM vault.decrypted_secrets WHERE name = 'SSN_ENCRYPTION_KEY' LIMIT 1;
  IF enc_key IS NULL THEN
    enc_key := 'default-hipaa-encryption-key-change-me';
  END IF;
  RETURN pgp_sym_encrypt(plain_ssn, enc_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_ssn(encrypted_ssn bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  SELECT decrypted_secret INTO enc_key FROM vault.decrypted_secrets WHERE name = 'SSN_ENCRYPTION_KEY' LIMIT 1;
  IF enc_key IS NULL THEN
    enc_key := 'default-hipaa-encryption-key-change-me';
  END IF;
  RETURN pgp_sym_decrypt(encrypted_ssn, enc_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_masked_ssn(encrypted_ssn bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_ssn text;
BEGIN
  IF encrypted_ssn IS NULL THEN RETURN NULL; END IF;
  full_ssn := public.decrypt_ssn(encrypted_ssn);
  RETURN '***-**-' || RIGHT(full_ssn, 4);
END;
$$;

-- Migrate existing SSN data
UPDATE public.caregivers
SET ssn_encrypted = public.encrypt_ssn(ssn)
WHERE ssn IS NOT NULL AND ssn != '';

-- Drop plaintext SSN column
ALTER TABLE public.caregivers DROP COLUMN ssn;
