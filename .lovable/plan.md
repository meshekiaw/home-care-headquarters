

## Add Edit Client Page

### Problem
The client profile has an "Edit Client" button linking to `/clients/:id/edit`, but no route or page exists for that URL — clicking it leads to a 404.

### Solution
Create a `ClientEdit` page that reuses the same form layout as `ClientNew`, but pre-fills it with the existing client data and performs an UPDATE instead of INSERT.

### Changes

| File | Change |
|------|--------|
| `src/pages/ClientEdit.tsx` | **New file.** Copy the form structure from `ClientNew.tsx`. On mount, fetch the client by URL param `id` and populate the form. On submit, call `supabase.from('clients').update(...)` instead of `insert`. Redirect back to the client profile on success. |
| `src/App.tsx` | Add route: `<Route path="/clients/:id/edit" element={<ProtectedRoute allowedRoles={["admin"]}><ClientEdit /></ProtectedRoute>} />` |

### Details
- The form fields, validation schema, and layout will match `ClientNew` exactly so the experience is consistent.
- The page title and submit button will say "Edit Client" / "Save Changes" instead of "Add New Client" / "Add Client".
- The back/cancel links will navigate to `/clients/:id` (the profile) instead of `/clients`.
- `client_hours` is stored as `numeric` in the DB; the form will convert string ↔ number on load/save.

