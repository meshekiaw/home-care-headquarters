## Fix: LMS Training Assignment – Caregiver Selection

### Root cause
`AssignCourseDialog.tsx` fetches caregivers inline with no error handling, no loading state, and no search. If the query errors (RLS, network) it silently shows an empty list, and there is no way to search through the 177+ active caregivers — making the list effectively unusable. There is also no toast on success/failure of the actual assignment.

The database does contain 177 active caregivers owned by the admin and RLS allows admins full select access, so the query itself should succeed — the UX gaps are the real blocker.

### Changes (frontend only, single file: `src/components/lms/AssignCourseDialog.tsx`)

1. **Loading state**: track `loadingCaregivers`; show a spinner inside the scroll area while fetching.
2. **Error handling**: capture `{ data, error }`, surface errors via `useToast`, and log to console for debugging.
3. **Searchable dropdown**: add a search `Input` above the list that filters caregivers client-side by `first_name`/`last_name` (case-insensitive). "Select All" applies to the filtered set.
4. **Empty state**: distinguish "loading…", "no caregivers match your search", and "no active caregivers found".
5. **Success confirmation**: ensure the assign action toasts on success (already handled in `useLmsAssignments.assignCourse`, just confirm the dialog closes only after a successful insert by checking the returned value — minor refactor of `assignCourse` to return a boolean so the dialog can avoid closing on error).
6. **Stable ordering**: order caregivers by `last_name, first_name` for predictable display.

### Out of scope
- No DB/RLS changes (verified data + policies are correct).
- No changes to other LMS components or hooks beyond `assignCourse` returning a success flag.