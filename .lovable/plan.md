

## Remove Caregiver Role from Demetrich and Grant Full Admin Access

### Problem
Demetrich (homcarenetwork4@gmail.com) has both `admin` and `caregiver` roles. The `caregiver` role should be removed. Additionally, 36 tables still lack admin override RLS policies, which prevents her from editing records created by other users.

### Changes

| Area | Change |
|------|--------|
| Database migration | 1. Delete the `caregiver` role row for Demetrich's user ID (`30189f34-39a7-4a4e-acd5-2583f6ddf411`) |
| Database migration | 2. Add admin override RLS policies (SELECT, INSERT, UPDATE, DELETE) to all 36 remaining tables |
| Frontend | 3. Fix `useUserRole.ts` so failed/empty role lookups do NOT default to `admin` — return `null` instead |

### Tables receiving admin policies

**Staff**: `caregivers`, `caregiver_credentials`, `caregiver_skills`, `caregiver_availability`, `caregiver_applications`
**Nurses**: `nurses`, `nurse_credentials`
**Clients (related)**: `care_plans`, `client_assessments`, `client_caregivers`, `client_documents`, `client_nurses`, `client_required_skills`, `medical_history`
**Scheduling**: `appointments`, `monthly_calendar_assignments`, `monthly_calendars`
**Forms**: `form_templates`, `form_submissions`, `form_signatures`
**LMS**: `lms_courses`, `lms_assignments`, `lms_quiz_questions`, `lms_policies`, `lms_policy_acknowledgments`
**Orientation**: `orientation_modules`, `orientation_progress`, `orientation_quizzes`
**Communications**: `conversations`, `conversation_participants`, `messages`
**Compliance**: `state_regulations`, `generated_policies`, `agency_credentials`
**Other**: `notifications`, `notification_preferences`, `assessment_handoffs`

### Policy pattern per table

```sql
CREATE POLICY "Admins full select [table]"
  ON public.[table] FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins full insert [table]"
  ON public.[table] FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins full update [table]"
  ON public.[table] FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins full delete [table]"
  ON public.[table] FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
```

### Frontend fix

In `src/hooks/useUserRole.ts`, change the fallback when no role is found from `setRole("admin")` to `setRole(null)` so the system never grants admin UI access to users without an explicit role.

