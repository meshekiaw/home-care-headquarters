

## Add Excel (.xlsx) Support to Client Import

### Problem
Two issues are preventing your upload:
1. The import only accepts `.csv` files — your file is `.xlsx`
2. Your spreadsheet columns (`Last Name`, `First Name`, `DATE`, `Service`, `Admit Chart`, etc.) don't match the expected column names (`first_name`, `last_name`, `email`, `phone`, etc.)

### Your spreadsheet structure
| Last Name | First Name | DATE | Service | Admit Chart | 618 Nurse Assessment | RN Visit | Care Plan | Justification | Signatures... | VHA Document | Referral Form | File Scanned | Hard Copy File Created | Notes |
|-----------|-----------|------|---------|-------------|---------------------|----------|-----------|--------------|--------------|-------------|--------------|-------------|----------------------|-------|

### Solution
Add `.xlsx` file support and smart column mapping so your spreadsheet works as-is.

### Changes

**1. Install `xlsx` (SheetJS) package** for reading Excel files in the browser.

**2. Update `src/utils/csvParser.ts`**
- Add `parseExcelFile(file: File): Promise<ClientCSVRow[]>` that reads `.xlsx` via SheetJS
- Add column name mapping so common variations work automatically:
  - `Last Name` → `last_name`
  - `First Name` → `first_name`
  - `DATE` → maps to `created_at` or is stored as `notes` context
  - `Notes` → `notes`
- Columns unique to your spreadsheet (Service, Admit Chart, 618 Nurse Assessment, RN Visit, Care Plan, etc.) will be concatenated into the `notes` field so that data is preserved

**3. Update `src/components/clients/BulkImportDialog.tsx`**
- Change file input `accept` to `.csv,.xlsx,.xls`
- Update `handleFile` to detect file type:
  - `.csv` → existing text-based parser
  - `.xlsx/.xls` → new Excel parser
- Both paths feed into the same `validateAndTransformClients` pipeline
- Update UI text from "CSV file" to "CSV or Excel file"

### What stays the same
- Validation, preview table, import flow, and database insertion are all unchanged
- The caregiver import is not affected

### Technical details
- SheetJS runs entirely in the browser — no backend changes needed
- Column mapping is case-insensitive and handles spaces/underscores
- Unrecognized columns are preserved in the `notes` field so no data is lost
