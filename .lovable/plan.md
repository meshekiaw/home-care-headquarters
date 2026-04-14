

## Make Home Care Headquarters HIPAA Compliant

HIPAA compliance requires both technical safeguards and organizational measures. This plan covers all technical changes we can implement in the app. Organizational items (like signing a BAA with your hosting provider) are noted but cannot be done in code.

---

### Critical Security Fixes (from scan)

**1. Make `client-documents` storage bucket private**
- Change from public to private
- Tighten RLS policies so only the document owner (`user_id = auth.uid()`) can read/delete files
- Use signed URLs for file access instead of public URLs

**2. Encrypt caregiver SSNs**
- Add an `ssn_encrypted` column to `caregivers`
- Create a security-definer function to encrypt/decrypt SSNs using `pgcrypto` and a server-side key
- Remove raw SSN from API responses; only return masked version (last 4 digits)
- Migrate existing SSN data to encrypted column, then drop the plaintext `ssn` column

**3. Fix storage DELETE policy on `client-documents`**
- Replace the overly broad DELETE policy with one that verifies ownership via the `client_documents` table

**4. Enable leaked password protection**
- Use `configure_auth` to enable HIBP password checking on signup/password change

---

### HIPAA-Required Features to Add

**5. Audit logging table + triggers**
- Create an `audit_logs` table: `id`, `user_id`, `action` (view/create/update/delete), `table_name`, `record_id`, `ip_address`, `metadata`, `created_at`
- Add database triggers on PHI tables (clients, medical_history, care_plans, client_documents, caregivers) to auto-log INSERT/UPDATE/DELETE
- Add a read-only Audit Log page in the admin dashboard
- RLS: only admins can view audit logs

**6. Automatic session timeout**
- Add an inactivity timer (15 minutes) that auto-logs users out
- Create a `SessionTimeoutProvider` component wrapping the app
- Tracks mouse/keyboard/touch events; shows a warning at 13 minutes; logs out at 15

**7. Make `orientation-audio` bucket private**
- Currently public; audio content should be behind auth
- Update to private with proper RLS

---

### Database Migrations

One migration covering:
- `client-documents` bucket: set `public = false`, tighten storage RLS policies
- `orientation-audio` bucket: set `public = false`
- `audit_logs` table creation with RLS (admin-only read, system insert via trigger)
- Audit trigger function + triggers on PHI tables
- SSN encryption function + column migration
- Fix storage DELETE policy

### Code Changes

| File | Change |
|------|--------|
| `src/components/auth/SessionTimeoutProvider.tsx` | New: inactivity timer component |
| `src/App.tsx` | Wrap app with `SessionTimeoutProvider` |
| `src/pages/AuditLog.tsx` | New: admin audit log viewer page |
| `src/components/layout/DashboardLayout.tsx` | Add Audit Log nav item |
| `src/App.tsx` | Add `/audit-log` route (admin only) |
| Components using `client-documents` public URLs | Switch to signed URL fetching via Supabase storage API |
| `src/components/caregivers/AddCaregiverDialog.tsx` | Mask SSN input, store via edge function |
| `supabase/functions/manage-ssn/index.ts` | New: edge function to encrypt/decrypt SSN server-side |

### Auth Configuration
- Enable leaked password protection (HIBP check)

### Organizational Requirements (not code -- for your awareness)
- **Business Associate Agreement (BAA)**: You need a BAA with your infrastructure provider
- **Staff training**: Document HIPAA training for anyone with system access
- **Incident response plan**: Document procedures for data breaches
- **Data backup & recovery**: Ensure regular encrypted backups

---

### Files modified/created
- 1 database migration (audit logs, SSN encryption, storage fixes)
- `src/components/auth/SessionTimeoutProvider.tsx` (new)
- `src/pages/AuditLog.tsx` (new)
- `src/App.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `supabase/functions/manage-ssn/index.ts` (new)
- Components referencing `client-documents` public URLs
- `src/components/caregivers/AddCaregiverDialog.tsx`
- Auth configuration update (HIBP)

