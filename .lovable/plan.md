

## Add "Client Forms" Upload Tab to Client Profile

### Goal
Add a new tab to the client profile where you can upload and manage specific document types: Care Plan, Authorizations, Admit Chart, 618, and Emergency Care Forms.

### Changes

**1. Create `src/components/clients/ClientFormsTab.tsx`**
- New component with a categorized upload interface
- Pre-defined document categories: Care Plan, Authorization, Admit Chart, 618, Emergency Care Form
- Each category shown as a section/card with:
  - Upload button (accepts PDF, images, Word docs)
  - List of uploaded files with date, download link, and delete option
  - Status indicator (uploaded / missing)
- Files stored in the existing `client-documents` storage bucket
- Records saved to the existing `client_documents` table with the category field set to the document type
- Uses real file upload to storage (not just URL input like the current Documents tab)

**2. Update `src/pages/ClientProfile.tsx`**
- Import the new `ClientFormsTab` component
- Add a new tab trigger labeled "Forms" between the existing tabs (after Documents, before Nurses)
- Add the corresponding `TabsContent` rendering the component with `clientId`

### How it works
- User clicks the "Forms" tab on a client profile
- Sees 5 sections: Care Plan, Authorizations, Admit Chart, 618, Emergency Care Form
- Each section has an "Upload" button that opens a file picker
- Selected file uploads directly to storage, creates a database record with the correct category
- Uploaded files appear in their section with download and delete options
- No new database tables or migrations needed -- uses existing `client_documents` table and `client-documents` bucket

### Technical details
- File upload uses `supabase.storage.from('client-documents').upload(...)` 
- File path pattern: `{clientId}/{category}/{filename}`
- Category values: `care_plan`, `authorization`, `admit_chart`, `618`, `emergency_care_form`
- The existing Documents tab remains unchanged for general documents
- Files modified: `ClientProfile.tsx` (add tab), new `ClientFormsTab.tsx`

