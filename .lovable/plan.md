

## Change "Due Soon" color from yellow-600 to bright yellow

The current `text-yellow-600` and `border-yellow-500` classes produce an amber/orange tone. Replace them with a brighter, more distinctly yellow color.

### Changes

**Two files**, replacing all 618-related yellow classes:

1. **`src/pages/Clients.tsx`** (line ~611-615)
   - `text-yellow-600` → `text-yellow-400`
   - `border-yellow-500 text-yellow-600` → `border-yellow-400 text-yellow-400`

2. **`src/components/clients/ClientOverview.tsx`** (lines ~219-221)
   - `border-yellow-500 text-yellow-600` → `border-yellow-400 text-yellow-400`
   - `text-yellow-600` → `text-yellow-400`

`yellow-400` (#facc15) is a bright, saturated yellow that reads clearly as yellow rather than orange.

No other files affected — the yellow in nurses/compliance pages is unrelated.

