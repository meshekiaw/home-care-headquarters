

## Add Nurse Visit Upload Category to Client Forms

The Forms tab is working correctly with all 7 existing categories visible. The only missing piece is the **Nurse Visit** upload category.

### Change

| File | Change |
|------|--------|
| `src/components/clients/ClientFormsTab.tsx` | Add `{ key: "nurse_visit", label: "Nurse Visit", description: "Nurse visit documentation and notes" }` to `FORM_CATEGORIES` array |

No database or storage changes needed. The category is stored as text in the existing `client_documents.category` column.

