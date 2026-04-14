
Goal: make Demetrich’s client edits actually work, not just load the edit screen.

What I found:
- Demetrich does have an `admin` role in the backend.
- The `clients` table already has admin SELECT/INSERT/UPDATE/DELETE policies.
- The edit page and route exist and are wired correctly.
- Since the problem still persists after those policies were added, the remaining issue is most likely the update path itself: the current policy setup is still ambiguous for UPDATEs, and the edit form does not force the database to return a row, so failed/blocked updates are hard to detect cleanly.

Plan to fix

1. Harden the `clients` update policy
- Replace the recently added admin client policies with explicit versions that include the correct checks for both existing rows and updated rows.
- For UPDATE specifically, use both:
  - `USING (public.has_role(auth.uid(), 'admin'::app_role))`
  - `WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role))`
- Keep the existing owner-based policies for non-admin users.

2. Make the edit request fail loudly if no row is updated
- Update `src/pages/ClientEdit.tsx` so the save call returns the updated row:
  - use `.update(...).eq("id", id).select("id").single()`
- This prevents silent no-op updates and gives a real error when RLS blocks the mutation.

3. Improve the edit-page error handling
- Show a clearer toast when the update is rejected.
- Include the backend message instead of only a generic failure notice.
- Keep the current validation behavior for field-level errors.

4. Verify the route end-to-end after the fix
- Test with Demetrich on:
  - a client she owns
  - a client created by the other admin
- Confirm:
  - edit page loads
  - save succeeds
  - values persist on the profile page and client list

Files/areas to update
- `supabase/migrations/...sql`
  - replace the current admin client policies with stricter explicit ones
- `src/pages/ClientEdit.tsx`
  - make update requests return a row and surface failures properly

Technical notes
- The current route and role hook are not the main blocker.
- Demetrich’s admin role exists, so this does not look like account provisioning.
- The highest-confidence fix is to make the UPDATE policy explicit and make the client update request require a successful returned row.
