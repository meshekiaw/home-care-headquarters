

## Add Page 9 Fields to Application Form Filler

### What's on Page 9
"Acceptance of Assignment" — acknowledges the employee's receipt of a patient assignment. It has:
- Patient Name, Address, Phone, Plan of Care Summary (admin-filled, but we can include them)
- **Employee Signature line** with three columns: Employee (signature), Fill IN Employee (printed name), and Date

### Changes

**File: `src/components/caregivers/ApplicationFormFiller.tsx`**

Add the following fields to the `APPLICATION_FIELDS` array between the Page 8 and Page 11 sections (around line 96):

```text
// ============ PAGE 9 - Acceptance of Assignment ============
- p9_patient_name   — "Patient Name" (text, admin field)
- p9_patient_addr   — "Patient Address" (text, admin field)  
- p9_patient_phone  — "Patient Phone" (text, admin field)
- p9_care_summary   — "Plan of Care Summary" (text, admin field)
- p9_employee_name  — "Employee Printed Name" (text, name_mirror tag)
- p9_date           — "Date" (date, date_mirror tag)
```

The Employee Printed Name field will be tagged with `name_mirror` so it auto-fills when the primary name is entered on Page 1. The Date field will be tagged with `date_mirror` so it auto-fills with today's date.

Coordinates will be estimated based on the parsed document layout and the page screenshot, consistent with the existing coordinate mapping pattern used throughout the file.

### No other files change
This is a field-mapping addition only — no new components, routes, or database changes needed.

