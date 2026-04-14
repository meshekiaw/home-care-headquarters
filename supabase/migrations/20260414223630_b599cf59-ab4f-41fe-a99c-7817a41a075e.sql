
-- Drop the existing admin update policy (missing WITH CHECK)
DROP POLICY IF EXISTS "Admins can update all clients" ON public.clients;

-- Recreate with explicit WITH CHECK
CREATE POLICY "Admins can update all clients"
ON public.clients FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
