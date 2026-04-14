

## Add Dedicated Columns for 618 Due Date and Authorization Expiration Date

The `clients` table already has a `notes` column, so Notes from the spreadsheet will continue mapping there directly. The two compliance date fields need new dedicated columns.

### Database Migration

Add two new date columns to the `clients` table:

```sql
ALTER TABLE public.clients ADD COLUMN authorization_due_date date NULL;
ALTER TABLE public.clients ADD COLUMN authorization_expiration_date date NULL;
```

### File Changes

**1. `src/utils/excelParser.ts`**
- Add to `COLUMN_MAP`:
  - `"618 dute date"` → `"authorization_due_date"`
  - `"authorization expiration date"` → `"authorization_expiration_date"`
- Handle Excel Date objects for these fields (same as DOB handling)

**2. `src/utils/csvParser.ts`**
- Add `authorization_due_date` and `authorization_expiration_date` to `ClientCSVRow` and `ParsedClient` interfaces
- Parse these date fields in `validateAndTransformClients` (same date format logic as DOB)

**3. `src/pages/Clients.tsx`**
- Include `authorization_due_date` and `authorization_expiration_date` in the bulk import insert call

**4. `src/pages/ClientProfile.tsx`**
- Add the two new fields to the `Client` interface

**5. `src/components/clients/ClientOverview.tsx`**
- Add the two new fields to the `Client` interface
- Display them in a new "Compliance Dates" card showing 618 Due Date and Authorization Expiration Date

**6. `src/pages/ClientNew.tsx`**
- Add optional input fields for the two new dates in the add-client form

### Result
- "618 Dute Date" → stored in `authorization_due_date` column
- "Authorization Expiration Date" → stored in `authorization_expiration_date` column
- "Notes" → stored in existing `notes` column (already works)
- All three fields display separately in the client profile

