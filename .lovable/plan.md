

## Add Date Filters to Clients Page

### What it does
Makes the Filters button functional and adds date-based filtering for 618 Due Date and Authorization Expiration Date, plus a status filter.

### Changes

**`src/pages/Clients.tsx`**

1. Add state: `filterOpen` (boolean), `statusFilter` (string, default `"all"`), `dueDateMonth` (string, default `"all"`), `expirationDateMonth` (string, default `"all"`)
2. Wire the Filters button with `onClick={() => setFilterOpen(!filterOpen)}` and show active filter count as a badge
3. When `filterOpen` is true, render a filter bar below the search row with:
   - **Status**: Select dropdown (All, Active, Inactive, Pending)
   - **618 Due Date Month**: Select dropdown dynamically populated with year-month values from clients that have `authorization_due_date` set (e.g. "Jan 2026", "Feb 2026")
   - **Auth Expiration Month**: Select dropdown dynamically populated from `authorization_expiration_date`
   - **Clear Filters** button to reset all
4. Apply filters to `filteredClients` -- match status, match year-month of due date, match year-month of expiration date
5. When sorting by `authorization_due_date` or `authorization_expiration_date`, show the relevant date column in the table so you can see which month each client is in

### Files modified
- `src/pages/Clients.tsx`

