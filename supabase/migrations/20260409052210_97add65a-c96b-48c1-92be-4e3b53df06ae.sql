
-- Add 'caregiver' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'caregiver';

-- Add auth_user_id to caregivers table
ALTER TABLE public.caregivers
ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS policy: let caregivers view their own record
CREATE POLICY "Caregivers can view their own record"
ON public.caregivers
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- RLS policy: let caregivers update their own record (profile management)
CREATE POLICY "Caregivers can update their own record"
ON public.caregivers
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid());

-- Let caregivers read their own orientation progress
CREATE POLICY "Caregivers can view their own orientation progress"
ON public.orientation_progress
FOR SELECT
TO authenticated
USING (caregiver_id IN (
  SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid()
));

-- Let caregivers insert/update their own orientation progress
CREATE POLICY "Caregivers can manage their own orientation progress"
ON public.orientation_progress
FOR ALL
TO authenticated
USING (caregiver_id IN (
  SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid()
))
WITH CHECK (caregiver_id IN (
  SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid()
));

-- Let caregivers read orientation modules (content)
CREATE POLICY "Caregivers can view orientation modules"
ON public.orientation_modules
FOR SELECT
TO authenticated
USING (true);

-- Let caregivers read orientation quizzes
CREATE POLICY "Caregivers can view orientation quizzes"
ON public.orientation_quizzes
FOR SELECT
TO authenticated
USING (true);

-- Let caregivers view their own role
CREATE POLICY "Caregivers can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
