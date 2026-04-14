
-- Fix the overly permissive insert policy on audit_logs
-- Only the trigger function (running as SECURITY DEFINER) needs to insert
DROP POLICY "System can insert audit logs" ON public.audit_logs;

-- No INSERT policy needed for regular users - the SECURITY DEFINER trigger handles inserts
-- Create a restrictive policy that only allows the trigger (which runs as table owner)
CREATE POLICY "No direct inserts to audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (false);
