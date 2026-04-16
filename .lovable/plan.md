

## Make "Due Soon" a lighter, brighter yellow

The classes are already `yellow-400` but may appear muted in context. Switching to `yellow-300` (#fde047) gives a lighter, more vivid yellow matching the screenshot.

### Changes

1. **`src/pages/Clients.tsx`** (~lines 611, 615)
   - `text-yellow-400` → `text-yellow-300`
   - `border-yellow-400 text-yellow-400` → `border-yellow-300 text-yellow-300`

2. **`src/components/clients/ClientOverview.tsx`** (~lines 219, 221)
   - `border-yellow-400 text-yellow-400` → `border-yellow-300 text-yellow-300`
   - `text-yellow-400` → `text-yellow-300`

No other files affected. No database changes.

