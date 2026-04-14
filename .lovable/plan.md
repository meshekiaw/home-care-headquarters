

## Update Excel Importer for Your Updated Spreadsheet

### Your actual spreadsheet columns

| Column | Maps to DB field | Handling |
|---|---|---|
| Last Name | `last_name` | Direct (already works) |
| First Name | `first_name` | Direct (already works) |
| Date of Birth | `date_of_birth` | Already mapped; fix date parsing for `M/D/YY` format |
| Phone number | `phone` | Already mapped |
| Address | `address` | Already mapped |
| City | `city` | Already mapped |
| State | `state` | Already mapped |
| Zip Code | `zip_code` | Already mapped |
| Emergency contact Name | `emergency_contact_name` | Already mapped |
| Emergency Contact Phone | `emergency_contact_phone` | Already mapped |
| 618 Dute Date | `notes` | Append as "618 Due Date: value" |
| Authorization Expiration Date | `notes` | Append as "Authorization Expiration Date: value" |
| Status | `status` | ✓ = "active", blank = "inactive" |
| Notes | `notes` | Already mapped |

### Changes needed

**1. `src/utils/excelParser.ts`**
- Add `"618 dute date"` and `"authorization expiration date"` to COLUMN_MAP (mapped to notes with labels -- handled by existing extra-column logic, so no COLUMN_MAP entry needed)
- Add special handling for Status column: convert `✓` / `✔` to `"active"`, blank to `"inactive"`
- Add `raw_dates: true` option to `XLSX.read()` or handle Excel serial date numbers that SheetJS may return for date columns

**2. `src/utils/csvParser.ts`**
- In `validateAndTransformClients`, update date parsing to handle `M/D/YY` format (e.g., `1/1/59` → `1959-01-01`, `7/8/52` → `1952-07-08`)
- Handle 2-digit years: years > 30 → 1900s, years <= 30 → 2000s (so `59` = 1959, `26` = 2026)
- Accept `✓` as a valid status value mapped to `"active"`

### Result
- All 14 columns from your spreadsheet will import correctly
- Names, phone, address, city, state, zip, emergency contacts map directly to DB fields
- Date of Birth parses `M/D/YY` format correctly
- 618 Due Date and Authorization Expiration Date are preserved in notes
- Status checkmarks become "active"

### Files modified
- `src/utils/excelParser.ts` -- status checkmark conversion
- `src/utils/csvParser.ts` -- M/D/YY date format support, checkmark status handling

