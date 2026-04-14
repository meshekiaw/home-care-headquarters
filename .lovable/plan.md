

## Fix: Add Authentication to `generate-policy` Edge Function

### Problem
The `generate-policy` edge function has no authentication check. Anyone can POST to it and consume AI credits.

### Solution
Add JWT verification and admin-only role check at the top of the handler. Only users with the `admin` role can generate policies.

### Changes

**`supabase/functions/generate-policy/index.ts`**
- Import `createClient` from Supabase JS
- Extract the `Authorization` header; return 401 if missing
- Create a user-scoped Supabase client and call `getClaims()` to verify the JWT
- Create a service-role client and query `user_roles` to confirm the caller has the `admin` role; return 403 if not
- Existing logic (regulation validation, AI call) remains unchanged

**Security finding** — mark `open_generate_policy` as fixed after deployment.

