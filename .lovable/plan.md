

## Caregiver Application Form with Smart Pre-Population

### Overview
Build a dedicated caregiver application page (similar to the existing Form618Filler pattern) where caregivers complete a PDF application form directly in the app. The form preserves the original PDF layout for printing and intelligently pre-populates fields.

### Smart Pre-Population Rules
1. **Employee Name** - When entered once, auto-fills every name field across all pages/sections
2. **Date** - Today's date auto-fills all date fields (editable if needed)
3. **Caregiver profile data** - Pre-fills email, phone, address from the caregiver's existing profile record in the database

### Architecture (follows Form618Filler pattern)

**New files:**
- `src/components/caregivers/ApplicationFormFiller.tsx` - Custom PDF filler component with mapped field coordinates (like Form618Filler) and pre-population logic
- `src/pages/CaregiverApplication.tsx` - Page wrapper for caregivers to access the form

**Modified files:**
- `src/components/layout/CaregiverLayout.tsx` - Add "My Application" nav item
- `src/App.tsx` - Add `/my-application` caregiver route

**Database:**
- New `caregiver_applications` table to store submission status and filled data (JSON)
- Storage: Upload the PDF template to `client-documents` bucket

### How It Works
1. Admin uploads the JotForm PDF once (stored as a template)
2. When a caregiver opens "My Application", the PDF renders page-by-page on a canvas
3. A side panel shows grouped form fields by section (matching the PDF layout)
4. Typing the employee name propagates to all name fields automatically
5. Date fields default to today's date
6. Profile fields (email, phone) pull from the caregiver's database record
7. "Download" produces a filled PDF preserving the exact original format
8. Submission saves progress to the database so admins can review

### Pre-Population Logic
```text
Field Change Handler:
  if field is "employee_name" (primary):
    -> set all fields tagged as "name_mirror" to same value
  if field is "date" (primary):
    -> set all fields tagged as "date_mirror" to same value

On Mount:
  -> fetch caregiver record (first_name, last_name, email, phone, address)
  -> pre-fill mapped fields
  -> set all date fields to today's date
```

### Next Step
**I need the JotForm application PDF uploaded** so I can inspect every page, identify all fields, and map their exact coordinates for the filler component. Please upload the PDF file.

