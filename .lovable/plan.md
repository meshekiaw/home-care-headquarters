

## Add Sort-By for Compliance Dates on Clients Page

### What it does
Adds sorting options to group clients by their 618 Due Date month or Authorization Expiration Date month, in addition to the existing name/city/status options.

### Changes

**`src/pages/Clients.tsx`**
1. Add `sortBy` state with options: `name`, `city`, `status`, `created_at`, `authorization_due_date`, `authorization_expiration_date`
2. Add a "Sort by" `Select` dropdown next to the Filters button
3. Sort logic:
   - **618 Due Date** -- groups by year-month of `authorization_due_date`, earliest month first; clients with no date go to the bottom
   - **Authorization Expiration Date** -- same grouping by year-month of `authorization_expiration_date`
   - **City** -- alphabetical by city
   - **Name** -- alphabetical by last name, then first name
   - **Status** -- active → pending → inactive
   - **Date Added** -- newest first
4. Import `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` and `ArrowUpDown` icon

### Result
A dropdown in the toolbar lets you pick "618 Due Date" or "Auth Expiration Date" to see all clients in the same month grouped together, sorted chronologically.

