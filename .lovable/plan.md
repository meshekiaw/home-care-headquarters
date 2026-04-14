

## Add Select All with Bulk Actions to Clients Page

### Goal
Add checkboxes to each row in the clients table with a "Select All" checkbox in the header, enabling bulk selection of clients. Include a bulk action bar for common operations (e.g., Export Selected, Delete Selected).

### Changes

**1. Update `src/pages/Clients.tsx`**
- Add `selectedIds: Set<string>` state to track selected client IDs
- Add a `Checkbox` in the table header that toggles all filtered clients
- Add a `Checkbox` in each table row tied to that client's ID
- Show a bulk action bar when any clients are selected, with:
  - "X selected" count
  - "Export Selected" button (exports only checked rows)
  - "Deselect All" button
- Clear selection when search query changes
- Import `Checkbox` from `@/components/ui/checkbox`

### How it works
- Clicking the header checkbox selects/deselects all visible (filtered) clients
- Clicking a row checkbox toggles that individual client
- A bar appears above the table showing how many are selected with bulk action buttons
- "Export Selected" exports only the checked clients to CSV

