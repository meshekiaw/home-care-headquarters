
# Caregiver Login System

## Summary
Enable caregivers to log in with their own credentials. Admins create accounts for them. Caregivers get a limited dashboard with access to orientation, their profile, and communications.

## Changes

### 1. Link caregivers to auth accounts (database migration)
- Add `auth_user_id` column to `caregivers` table (nullable UUID, unique)
- This links a caregiver record to a Supabase auth user
- Add the `caregiver` value to the existing `app_role` enum
- When admin creates a caregiver account, a corresponding auth user is created and linked

### 2. Admin creates caregiver credentials
- Add a "Create Login" button on each caregiver's row/profile
- Admin enters an email and temporary password for the caregiver
- Backend creates the auth user, assigns the `caregiver` role in `user_roles`, and links `auth_user_id` on the caregivers table
- Create an edge function to handle user creation (since client-side `signUp` would log out the admin)

### 3. Caregiver dashboard
- Create a new `CaregiverDashboard` page with limited navigation:
  - **My Orientation** — link to their orientation viewer
  - **My Profile** — view/edit their own caregiver info
  - **Communications** — access messaging
- No access to admin pages (clients, scheduling, analytics, settings, etc.)

### 4. Role-based routing
- Update `ProtectedRoute` to check the user's role
- Admin users → current dashboard and full navigation
- Caregiver users → caregiver dashboard with limited navigation
- Update `DashboardLayout` sidebar to show different nav items based on role

### 5. Update login page
- The existing login page works for both admins and caregivers
- After login, redirect based on role (admin → `/dashboard`, caregiver → `/my-dashboard`)

## Files
- **Database migration** — add `auth_user_id` to caregivers, add `caregiver` to `app_role` enum
- **Edge function** — `create-caregiver-account` to create auth users without logging out the admin
- `src/hooks/useUserRole.ts` — extend to return the specific role and handle caregiver role
- `src/pages/CaregiverDashboard.tsx` — new limited dashboard for caregivers
- `src/components/layout/CaregiverLayout.tsx` — new layout with limited sidebar
- `src/components/caregivers/CreateLoginDialog.tsx` — new dialog for admin to create credentials
- `src/pages/Caregivers.tsx` or `CaregiverProfile.tsx` — add "Create Login" button
- `src/App.tsx` — add caregiver routes
- `src/components/auth/ProtectedRoute.tsx` — add role-based routing
- `src/pages/Login.tsx` — update redirect logic based on role

## Notes
- Caregivers cannot sign up on their own — only admins create accounts
- The existing admin account and workflow remain unchanged
- Caregiver RLS policies will need updating so caregivers can read their own data
