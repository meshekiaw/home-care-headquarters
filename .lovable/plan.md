

## Fix: Robust Date Parsing for Excel & CSV Import

### Changes

**File 1: `src/utils/excelParser.ts`**
- Add a `normalizeDate(value: unknown): string | null` helper that handles:
  - `Date` objects → extract via UTC methods
  - Numbers (Excel serial dates) → convert using epoch formula (serial - 25569) * 86400000
  - Strings in M/D/YY or M/D/YYYY → parse manually into YYYY-MM-DD
  - Strings already in YYYY-MM-DD → pass through
- Replace the inline date branch (line ~82-84) with a call to `normalizeDate(rawValue)`

**File 2: `src/utils/csvParser.ts`**
- Add a `parseDateString(value: string): string | null` helper that:
  - Handles M/D/YY, M/D/YYYY, and YYYY-MM-DD formats
  - Constructs YYYY-MM-DD strings from numeric components only
  - Never uses `new Date()` or `toISOString()` (the source of timezone shifts)
- Replace the three date parsing blocks (date_of_birth, authorization_due_date, authorization_expiration_date) with calls to this helper

### No database changes. No other files affected.

