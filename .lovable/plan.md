

## Fix React `forwardRef` Warnings

### Changes

| File | Change |
|------|--------|
| `src/components/ui/skeleton.tsx` | Wrap `Skeleton` with `React.forwardRef` |
| `src/components/ui/badge.tsx` | Wrap `Badge` with `React.forwardRef` |

Both components will be updated to accept and forward refs to their underlying `<div>` elements, eliminating the console warnings.

