## Root cause

The "Select Course" dropdown is empty because the `lms_courses` table contains **0 rows** for this account. Verified directly against the database:

```
SELECT count(*) FROM lms_courses;  -- 0
```

The query in `useLmsCourses` and the RLS policies are correct — there is simply nothing to fetch. Courses are only created when an admin clicks **Add Course** in the LMS Training page, and none have been added yet under Demetrich's account.

## Fix

### 1. Seed a starter library of home-care LMS courses (data migration)

Insert a standard set of required home-care training courses owned by Demetrich's admin account (`30189f34-39a7-4a4e-acd5-2583f6ddf411`) so the dropdown has content immediately. Each row will use the existing `lms_courses` columns (no schema change).

Courses to seed (all `is_active = true`, `content_type = 'document'`):

| Title | Category | Required | Duration | Passing Score |
|---|---|---|---|---|
| HIPAA Privacy & Security | Compliance | Yes | 45 min | 80 |
| Bloodborne Pathogens | Safety | Yes | 30 min | 80 |
| Infection Control & PPE | Safety | Yes | 30 min | 80 |
| Abuse, Neglect & Exploitation Reporting | Compliance | Yes | 30 min | 80 |
| Client Rights & Dignity | Compliance | Yes | 20 min | 80 |
| Body Mechanics & Safe Transfers | Clinical | Yes | 30 min | 80 |
| Fall Prevention | Clinical | Yes | 20 min | 80 |
| Medication Reminders & Documentation | Clinical | Yes | 30 min | 80 |
| Emergency Preparedness | Safety | Yes | 30 min | 80 |
| Dementia & Alzheimer's Care | Clinical | No | 45 min | 80 |
| Activities of Daily Living (ADLs) | Clinical | Yes | 30 min | 80 |
| EVV (Electronic Visit Verification) | Compliance | Yes | 20 min | 80 |
| Cultural Competency | Professionalism | No | 20 min | 80 |
| Customer Service & Communication | Professionalism | No | 20 min | 80 |

`required_for_role` will be left null (applies to all roles). `content_body` will hold a short markdown placeholder so admins can edit/expand via the existing Add Course flow.

The migration will use `ON CONFLICT DO NOTHING` keyed on `(user_id, title)` — but since no such unique constraint exists, the safer approach is `INSERT ... WHERE NOT EXISTS (...)` per row to keep it idempotent without altering the schema.

### 2. Improve empty-state UX in `AssignCourseDialog.tsx` (frontend only)

Currently when `courses` is empty, the Select silently shows no options. Update so that:

- If `useLmsCourses().loading` is true → show a disabled "Loading courses…" item with spinner.
- If `courses.length === 0` after loading → show a disabled "No courses available — add one from the Courses tab" item.
- Active/published filter: also filter `courses` to `is_active === true` for the dropdown (admins shouldn't be able to assign inactive ones).

This is the only change to `AssignCourseDialog.tsx`. The caregiver-selection logic stays exactly as it is.

### 3. Expose `loading` from the hook usage

`useLmsCourses()` already returns `loading` — the dialog just needs to destructure it. No hook changes required.

## Files changed

- **New migration** — insert 14 seed courses for Demetrich's user_id (idempotent).
- **`src/components/lms/AssignCourseDialog.tsx`** — add loading + empty-state items in the course Select; filter to `is_active`. No changes to caregiver selection.

## Out of scope

- No RLS changes (verified policies are correct).
- No changes to `useLmsCourses.ts`, `AddCourseDialog.tsx`, or any caregiver code.
- No schema changes to `lms_courses`.
