

## Rename "618 Due Date" → "Current 618 Date"

A simple label rename across 5 files. No database or logic changes needed — just updating display text.

### Changes

| File | What changes |
|------|-------------|
| `src/components/clients/ClientOverview.tsx` | Label text on client profile overview |
| `src/pages/Clients.tsx` | Sort dropdown, filter label, and table header |
| `src/pages/ClientNew.tsx` | Form field label |
| `src/pages/ClientEdit.tsx` | Form field label |
| `src/utils/excelParser.ts` | Add "current 618 date" as an accepted import column alias |

All instances of "618 Due Date" become "Current 618 Date". The underlying database column (`authorization_due_date`) stays the same.

