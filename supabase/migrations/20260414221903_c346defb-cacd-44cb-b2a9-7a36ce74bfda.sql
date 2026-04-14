-- Admins can view all clients
CREATE POLICY "Admins can view all clients"
ON public.clients FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can create clients
CREATE POLICY "Admins can create clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all clients
CREATE POLICY "Admins can update all clients"
ON public.clients FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete all clients
CREATE POLICY "Admins can delete all clients"
ON public.clients FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));