

## Create Standalone Caregiver Availability Page

A new page at `/caregiver-availability` that shows all caregivers and their weekly availability schedules in a read-only overview format, accessible from the sidebar navigation.

### Changes

| File | Change |
|------|--------|
| `src/pages/CaregiverAvailability.tsx` | **New file** — standalone page that fetches all caregivers and their availability from the database, displays a filterable list with each caregiver's weekly schedule in a visual calendar grid |
| `src/App.tsx` | Add route `/caregiver-availability` wrapped in `ProtectedRoute` for admin role |
| `src/components/layout/DashboardLayout.tsx` | Add nav item with `Clock` icon labeled "Caregiver Availability" after the Caregivers entry |

### Page Design

- **Header**: Title "Caregiver Availability" with a search/filter bar to find caregivers by name
- **Caregiver cards**: Each card shows the caregiver's name, status badge, and a compact weekly availability grid (days as columns, hours as rows) with colored blocks for available time slots
- **Read-only view**: No editing — this is a visibility page for admins to quickly see who is available when
- **Empty state**: Message when a caregiver has no availability set, linking to their profile to configure it

### Technical Details

- Queries `caregivers` table for all active caregivers, then batch-fetches `caregiver_availability` for all caregiver IDs
- Reuses the existing visual style from `AvailabilityCalendar.tsx` (color blocks, time formatting) but in a compact read-only format
- Uses `DashboardLayout` wrapper consistent with all other admin pages
- All data scoped through existing RLS policies (admin has full access)

