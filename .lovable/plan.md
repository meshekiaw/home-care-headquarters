

## Build User Management UI in Settings

### What you get

A new "User Management" section on the Settings page where admins can:
- See a list of all users (admins and caregivers) with their name/email
- Edit a user's display name
- Reset a user's password (set a new one)

### Technical approach

**1. New Edge Function: `manage-user-account`**

A backend function (similar to `create-caregiver-account`) that uses the Admin Auth API to:
- Update a user's email or metadata (display name) via `adminClient.auth.admin.updateUserById()`
- Reset a user's password via `adminClient.auth.admin.updateUserById({ password })`
- Only callable by users with the `admin` role (verified server-side)

**2. New Component: `UserManagementSection`**

Added to the Settings page. It will:
- Query `user_roles` joined with caregiver names to list users
- Show each user's name, email, and role
- Provide "Edit" and "Reset Password" buttons per user
- Open dialogs for editing name/email or setting a new password

**3. Settings page update**

Add the `UserManagementSection` card between the Profile and Agency sections.

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/manage-user-account/index.ts` | New edge function for admin user updates |
| `src/components/settings/UserManagementSection.tsx` | New component listing users with edit/reset actions |
| `src/components/settings/EditUserDialog.tsx` | Dialog for editing name/email |
| `src/components/settings/ResetPasswordDialog.tsx` | Dialog for resetting password |
| `src/pages/Settings.tsx` | Import and render `UserManagementSection` |

