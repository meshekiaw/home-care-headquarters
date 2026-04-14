

## Grant Admin Access to Demetrich Brown

Demetrich Brown currently has a "caregiver" role, which restricts her to the caregiver dashboard only. To give her full access to the entire site, she needs the "admin" role.

### Changes

**Database migration** — Insert an `admin` role for Demetrich Brown's user account in the `user_roles` table. This will be done by:
1. Looking up her `auth_user_id` from the `caregivers` table
2. Adding an `admin` entry in `user_roles` for that user ID

This single database change gives her access to all admin routes (Clients, Scheduling, Analytics, Compliance, Settings, etc.) without any code changes.

### Technical detail
- The `useUserRole` hook already prioritizes `admin` over `caregiver` when both roles exist, so adding the admin role is sufficient
- No frontend code changes needed — the existing `ProtectedRoute` and `DashboardLayout` handle admin users automatically

### Files modified
- 1 database migration (insert admin role for Demetrich Brown's auth user)

