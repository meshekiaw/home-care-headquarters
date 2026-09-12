-- 1. Remove conflicting caregiver roles from users who are nurses (nurse wins)
DELETE FROM public.user_roles cr
WHERE cr.role = 'caregiver'
  AND EXISTS (
    SELECT 1 FROM public.user_roles nr
    WHERE nr.user_id = cr.user_id AND nr.role = 'nurse'
  );

-- 2. Keep the two roles mutually exclusive going forward
CREATE OR REPLACE FUNCTION public.enforce_nurse_caregiver_exclusive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'caregiver' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'nurse'
  ) THEN
    RAISE EXCEPTION 'User already has the nurse role; caregiver access cannot be granted'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.role = 'nurse' THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'caregiver';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_nurse_exclusive ON public.user_roles;
CREATE TRIGGER trg_user_roles_nurse_exclusive
BEFORE INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_nurse_caregiver_exclusive();

-- 3. Caregiver-scoped policies must never apply to a nurse account
DROP POLICY IF EXISTS "Caregivers can view their own record" ON public.caregivers;
CREATE POLICY "Caregivers can view their own record" ON public.caregivers
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() AND NOT public.has_role(auth.uid(), 'nurse'::app_role));

DROP POLICY IF EXISTS "Caregivers can update their own record" ON public.caregivers;
CREATE POLICY "Caregivers can update their own record" ON public.caregivers
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid() AND NOT public.has_role(auth.uid(), 'nurse'::app_role))
WITH CHECK (auth_user_id = auth.uid() AND NOT public.has_role(auth.uid(), 'nurse'::app_role));

DROP POLICY IF EXISTS "Caregivers view own assignments" ON public.lms_assignments;
CREATE POLICY "Caregivers view own assignments" ON public.lms_assignments
FOR SELECT TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'nurse'::app_role)
  AND caregiver_id IN (SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Caregivers update own assignments" ON public.lms_assignments;
CREATE POLICY "Caregivers update own assignments" ON public.lms_assignments
FOR UPDATE TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'nurse'::app_role)
  AND caregiver_id IN (SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  NOT public.has_role(auth.uid(), 'nurse'::app_role)
  AND caregiver_id IN (SELECT id FROM public.caregivers WHERE auth_user_id = auth.uid())
);

-- 4. Drop legacy creator-ownership policies on client data: these tables are
-- admin-managed, and the open policies let any authenticated user create and
-- then read client rows.
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view their own client assessments" ON public.client_assessments;
DROP POLICY IF EXISTS "Users can create their own client assessments" ON public.client_assessments;
DROP POLICY IF EXISTS "Users can update their own client assessments" ON public.client_assessments;
DROP POLICY IF EXISTS "Users can delete their own client assessments" ON public.client_assessments;

DROP POLICY IF EXISTS "Users can view their own client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can create their own client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can update their own client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can delete their own client documents" ON public.client_documents;

DROP POLICY IF EXISTS "Users can view their own care plans" ON public.care_plans;
DROP POLICY IF EXISTS "Users can create their own care plans" ON public.care_plans;
DROP POLICY IF EXISTS "Users can update their own care plans" ON public.care_plans;
DROP POLICY IF EXISTS "Users can delete their own care plans" ON public.care_plans;

DROP POLICY IF EXISTS "Users can view their own medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Users can create their own medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Users can update their own medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Users can delete their own medical history" ON public.medical_history;

DROP POLICY IF EXISTS "Users can view their own caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Users can create their own caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Users can update their own caregivers" ON public.caregivers;
DROP POLICY IF EXISTS "Users can delete their own caregivers" ON public.caregivers;

DROP POLICY IF EXISTS "Users can view their own assignments" ON public.lms_assignments;
DROP POLICY IF EXISTS "Users can create their own assignments" ON public.lms_assignments;
DROP POLICY IF EXISTS "Users can update their own assignments" ON public.lms_assignments;
DROP POLICY IF EXISTS "Users can delete their own assignments" ON public.lms_assignments;