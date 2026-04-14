

## Expand Bulk Actions for Selected Clients

### Goal
Add more useful bulk action options to the action bar that appears when clients are selected.

### New bulk actions to add

Currently only "Export Selected" and "Deselect All" exist. The following will be added:

1. **Change Status** — Dropdown to set all selected clients to Active, Inactive, or Pending in one click (updates database in batch)
2. **Delete Selected** — Remove selected clients with a confirmation dialog to prevent accidents
3. **Send Message** — Navigate to Communications page with selected clients pre-loaded (or show a compose dialog)
4. **Print Selected** — Open browser print dialog with a formatted list of selected client details
5. **Assign Caregiver** — Open a dialog to assign a caregiver to all selected clients at once

### Changes

**Update `src/pages/Clients.tsx`**
- Add a "Change Status" dropdown button using `DropdownMenu` with options: Active, Inactive, Pending — each calls `supabase.from('clients').update({ status }).in('id', [...selectedIds])` then refreshes
- Add a "Delete Selected" button that shows an `AlertDialog` confirmation, then calls `supabase.from('clients').delete().in('id', [...selectedIds])` and refreshes
- Add a "Print Selected" button that opens `window.print()` with selected client data
- Restyle the bulk action bar to accommodate the additional buttons cleanly with wrapping on mobile

### What stays the same
- Export Selected and Deselect All remain as-is
- Individual row actions unchanged
- No new database tables needed

