

## Fix: Excel Date Timezone Offset Bug

### Problem
The Excel parser uses local-timezone Date methods (`getFullYear()`, `getMonth()`, `getDate()`) on Date objects that the XLSX library creates in UTC. This causes dates to shift by one day in US timezones.

Example: A spreadsheet date of `1/15/2025` becomes `2025-01-14` after import.

### Fix

**File: `src/utils/excelParser.ts`** (line 84)

Change the date extraction from local timezone methods to UTC methods:

```typescript
// Before
mapped[mappedKey] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// After
mapped[mappedKey] = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
```

One line change. No other files affected.

### After the Fix
Previously imported clients with wrong dates would need to be re-imported or manually corrected in the client edit page.

