
## Fix the actual cause of the date mismatch

I reviewed the current code, and the import parser is not the only problem.

### What is actually happening
The client import now normalizes Excel/CSV dates into plain `YYYY-MM-DD` strings, which is correct for date-only fields.

But the UI is still doing this in several places:
- `new Date("YYYY-MM-DD")`
- `.toLocaleDateString(...)`
- `getFullYear()/getMonth()/getDate()` on those parsed values

For date-only strings, JavaScript treats `"YYYY-MM-DD"` as UTC. In US time zones, that shifts the displayed date backward by one day. So the spreadsheet can import correctly, while the app still shows the wrong date.

That is why it still looks broken.

## Files I identified
- `src/pages/Clients.tsx`
  - month filtering for `authorization_due_date`
  - month filtering for `authorization_expiration_date`
  - displayed date cells for both fields
  - `formatYearMonth`
- `src/pages/ClientProfile.tsx`
  - `formatDate`
  - `calculateAge`

## Implementation plan

### 1. Add a timezone-safe helper for date-only strings
Create a small shared utility for fields stored as `YYYY-MM-DD` that:
- formats date-only strings without `new Date("YYYY-MM-DD")`
- extracts year/month safely
- calculates age safely from string parts

This helper will treat date-only values as calendar dates, not timestamps.

### 2. Update client list page to use the safe helper
In `src/pages/Clients.tsx`:
- replace `new Date(client.authorization_due_date)` month logic
- replace `new Date(client.authorization_expiration_date)` month logic
- replace the table cell display formatting for both compliance dates
- keep timestamp handling like `created_at` unchanged

This fixes both:
- visible wrong dates
- wrong month filter grouping caused by timezone shifting

### 3. Update client profile page to use the safe helper
In `src/pages/ClientProfile.tsx`:
- replace `formatDate` for client date-only fields
- replace `calculateAge` so birthdays are computed from the stored date string directly
- keep real timestamp fields separate where needed

This fixes:
- DOB display
- Current 618 Date display
- Authorization Expiration display
- possible off-by-one age issues

### 4. Leave import parsing in place, but verify the full flow
I would not revert the parser work yet. The current parser changes are directionally correct. The missing piece is the display/filter layer still converting date-only values through JavaScript `Date`.

### 5. After implementation
- newly imported dates should match the spreadsheet exactly
- already imported records should also display correctly if the stored value is already `YYYY-MM-DD`
- only records that were actually stored incorrectly before the parser fix would still need correction/re-import

## Technical details
Use a date-only strategy like this:
- parse `YYYY-MM-DD` by splitting the string
- format using numeric year/month/day pieces
- for month filters, derive `YYYY-MM` from the string directly
- for age, compare month/day parts against today without constructing from UTC date strings

Important distinction:
- `created_at` and other timestamps can still use `new Date(...)`
- `date_of_birth`, `authorization_due_date`, and `authorization_expiration_date` should not

## Scope
Code changes only. No database migration needed.
