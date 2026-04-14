

## Add Client Class and Client Hours Fields

### What you get

Two new fields on every client record:
- **Client Class** — a dropdown with options: VA, Medicaid, Private Pay, ARChoices
- **Client Hours** — a numeric field for the client's authorized hours

These will appear in the client profile overview, the "Add New Client" form, the bulk import parser, and the client export.

### Plan

**1. Database migration** — Add two columns to the `clients` table:
- `client_class` (text, nullable, default null)
- `client_hours` (numeric, nullable, default null)

**2. Update "Add New Client" form** (`src/pages/ClientNew.tsx`)
- Add `client_class` and `client_hours` to the Zod schema and form state
- Add a Select dropdown for class (VA, Medicaid, Private Pay, ARChoices) and a numeric Input for hours in the Compliance section

**3. Update Client Profile overview** (`src/components/clients/ClientOverview.tsx`)
- Add `client_class` and `client_hours` to the Client interface
- Display them in the Personal Information card (class as text, hours as number)

**4. Update Client Profile page** (`src/pages/ClientProfile.tsx`)
- Add `client_class` and `client_hours` to the Client interface so they're fetched and passed through

**5. Update CSV export** (`src/utils/csvExport.ts`)
- Add `client_class` and `client_hours` to `formatClientForExport`

**6. Update bulk import parsers** (`src/utils/csvParser.ts`, `src/utils/excelParser.ts`)
- Map "client_class" and "client_hours" columns so imports can populate these fields

**7. Update Clients list page** (`src/pages/Clients.tsx`)
- Add `client_class` and `client_hours` to the Client interface so they display/export correctly

### Files changed

| File | Change |
|------|--------|
| Migration SQL | Add `client_class` and `client_hours` columns |
| `src/pages/ClientNew.tsx` | Add class dropdown + hours input to form |
| `src/components/clients/ClientOverview.tsx` | Display class and hours |
| `src/pages/ClientProfile.tsx` | Add fields to interface |
| `src/pages/Clients.tsx` | Add fields to interface |
| `src/utils/csvExport.ts` | Include in export |
| `src/utils/csvParser.ts` | Support in CSV import |
| `src/utils/excelParser.ts` | Support in Excel import |

