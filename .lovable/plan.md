

# Restrict Orientation Management to Administrators

## Summary

The Orientation Management page (adding, editing, deleting sections and quizzes) should only be accessible to administrators. Employees/caregivers should only be able to view and complete the orientation, not modify it. This project does not yet have a roles system, so one needs to be created.

## Changes

### 1. Create user_roles table and helper function (database migration)
- Create `app_role` enum with values: `admin`, `user`
- Create `user_roles` table with `user_id` and `role` columns, RLS enabled
- Create `has_role()` security-definer function to check roles without RLS recursion
- RLS policy: authenticated users can read their own roles

### 2. Create a useUserRole hook
- New file: `src/hooks/useUserRole.ts`
- Queries `user_roles` table for the current user
- Exposes `isAdmin` boolean and `loading` state

### 3. Protect the Orientation Management route
- In `OrientationManagement.tsx`, use the `useUserRole` hook
- If the user is not an admin, show a "not authorized" message or redirect to the orientation viewer instead
- The `/lms/orientation/:id` route (viewer) remains accessible to all authenticated users

### 4. Assign admin role
- After migration, the first logged-in user (you) will need to be assigned the admin role
- A one-time migration will insert your user into `user_roles` with `role = 'admin'`
- Alternatively, provide a simple way to assign roles from the Settings page later

## Files
- **Database migration** -- create `app_role` enum, `user_roles` table, `has_role()` function, RLS policies
- `src/hooks/useUserRole.ts` -- new hook
- `src/pages/OrientationManagement.tsx` -- add admin check, show unauthorized state for non-admins

## Notes
- The orientation viewer (`/lms/orientation/:id`) stays open to all authenticated users so employees can complete their orientation
- No changes to the orientation content or quiz CRUD logic itself
- This roles infrastructure can be reused later for other admin-only features

