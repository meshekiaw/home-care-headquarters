

## Add New Form Categories to Client Forms Tab

Two new document categories will be added to the `ClientFormsTab` component's `FORM_CATEGORIES` array:

| File | Change |
|------|--------|
| `src/components/clients/ClientFormsTab.tsx` | Add `"justification_of_frequency"` and `"client_medication_list"` to `FORM_CATEGORIES` |
| `mem://features/client-categorized-forms` | Update memory with new categories |

The existing upload/download/delete logic already works generically for any category, so the only code change is appending two entries:

```typescript
{ key: "justification_of_frequency", label: "Justification of Frequency", description: "Justification of frequency documentation" },
{ key: "client_medication_list", label: "Client Medication List", description: "Client medication list documents" },
```

No database or storage changes needed — these categories are stored as text in the existing `client_documents.category` column.

