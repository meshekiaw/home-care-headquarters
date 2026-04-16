

## Add 618 Due Date Color Coding to Clients List Page

### What changes
Always show a "618 Due Date" column in the clients table (not just when sorting by it), and color-code each row's due date based on urgency:
- **Red** (destructive): The calculated 618 due date is past today
- **Yellow/amber**: The calculated 618 due date is within 30 days from today
- **Default**: More than 30 days away or no date available

The calculated due date uses the same logic already in `ClientOverview.tsx`: VA clients get 6 months added, ARChoices/Medicaid/Private Pay get 12 months added to `authorization_due_date`.

### File: `src/pages/Clients.tsx`

1. Import `addMonthsToDate` — extract it from `ClientOverview.tsx` into a shared utility (or duplicate the small helper inline) along with `Badge` from the UI library.

2. Add a permanent "618 Due Date" column to the table header (remove the conditional `sortBy === 'authorization_due_date'` gate).

3. In each table row, compute the 618 due date based on `client.client_class` and `client.authorization_due_date`:
   - VA → add 6 months
   - ARChoices, Medicaid, Private Pay → add 12 months
   - Other/null → show raw `authorization_due_date` or "—"

4. Color-code the cell:
   - If past today: red text + "Overdue" badge (destructive)
   - If within 30 days: yellow/amber text + "Due Soon" badge (yellow outline)
   - Otherwise: normal muted text

5. Remove the old conditional `authorization_due_date` and `authorization_expiration_date` columns (or keep auth expiration as a separate always-visible column if desired).

### File: `src/components/clients/ClientOverview.tsx`

Move `addMonthsToDate` to a shared location or keep it duplicated (it's 10 lines). The function already exists and works correctly.

### No database changes needed.

