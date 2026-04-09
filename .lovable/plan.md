

## Add Application Tab to Admin Caregiver Profile

### What
Add an "Application" tab to the admin-facing caregiver profile page (`/caregivers/:id`) so admins can view and review a caregiver's filled application PDF without needing to log in as the caregiver.

### Steps

1. **Update `src/pages/CaregiverProfile.tsx`**
   - Import `ApplicationFormFiller` from `@/components/caregivers/ApplicationFormFiller`
   - Import `ClipboardList` icon
   - Change the TabsList grid from `grid-cols-5` to `grid-cols-6`
   - Add a new `TabsTrigger` for "Application" after the Calendar tab
   - Add a new `TabsContent` that renders `<ApplicationFormFiller>` with the caregiver's ID and data, using the same template path (`/templates/HCN_Application.pdf`)

2. **No database or route changes needed** -- the `caregiver_applications` table already has an RLS policy allowing admins (`auth.uid() = user_id`) to view and update applications, and the `ApplicationFormFiller` component already handles loading saved form data by `caregiver_id`.

### Technical detail
The `ApplicationFormFiller` component accepts `{ fileUrl, caregiverId, caregiverData }` props and is self-contained -- it loads saved progress, renders the PDF, and provides the side panel for viewing/editing fields. Embedding it in a `TabsContent` with a fixed height container is all that's needed.

