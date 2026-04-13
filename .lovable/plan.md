
Goal: fix only the pages you flagged — 1, 2, 5, 6, 8, 9, and 12 — by investigating each page individually and correcting the field mapping instead of applying another blanket offset.

What I found
- The current PDF filler still depends on hardcoded coordinates in `src/components/caregivers/ApplicationFormFiller.tsx`.
- The screenshots show different failure types on different pages:
  - Page 1: `dl_number` is too far left and overlaps the label.
  - Page 2: printed name / signature / date anchors are landing on the wrong rows.
  - Page 5: agreement date pieces and employee fields are not aligned to the blanks.
  - Page 6: there are no fields mapped to page 6 at all right now, which strongly suggests at least one field is assigned to the wrong page or the page needs its own mapping.
  - Page 8: printed name / signature / date are shifted and not respecting the specific lines.
  - Page 9: acceptance-of-assignment fields need their own recalibration, especially the signature row and care summary width.
  - Page 12: signature/date row is mispositioned and likely needs separate width/placement handling.

Implementation approach
1. Audit the existing field definitions for only pages 1, 2, 5, 6, 8, 9, and 12 in `ApplicationFormFiller.tsx`.
2. Rebuild those pages one by one:
   - verify whether each field belongs on the correct page
   - separate printed-name, signature, and date anchors instead of reusing loose shared assumptions
   - add or refine `widthPct` where line length matters
   - correct any page-number mismatches, especially around pages 5/6 and 8/12
3. Keep the rest of the document untouched so fixes stay isolated to the reported pages.
4. Generate and visually inspect a new filled PDF, checking those pages individually before considering the fix complete.

Page-by-page fix scope
- Page 1
  - Reposition `dl_number`
  - Verify SSN, DOB, address, phones, email on their own lines
- Page 2
  - Recalibrate all four acknowledgment blocks independently
  - Fix printed name, signature, and date rows separately
  - Verify `p2_position`
- Page 5
  - Re-anchor `p5_day`, `p5_month`, `p5_year`
  - Reposition employee name, address, rate, and position title
- Page 6
  - Investigate whether a missing or misassigned field should actually live here
  - Add explicit mapping if the template has fillable blanks on this page
- Page 8
  - Reposition printed name, signature, and date to their exact line segments
- Page 9
  - Reposition patient info and employee signature block
  - Tighten `p9_care_summary` so it stays inside its intended area
- Page 12
  - Re-anchor signature/date line and confirm the employee-name placement is not being drawn on the wrong row

Files involved
- `src/components/caregivers/ApplicationFormFiller.tsx`
- possibly `src/pages/CaregiverApplication.tsx` only if a page-routing/display issue is contributing, though right now the main problem appears to be field mapping

Technical details
- I will avoid a global offset pass.
- I will treat each page as its own layout problem.
- For text fields, I’ll use bounded placement where possible:
```text
x = pageWidth * xPct
y = pageHeight * yPct
maxWidth = pageWidth * widthPct
```
- For signature/date lines, I’ll calibrate each anchor separately rather than assuming uniform spacing across repeated sections.
- Because page 6 currently has no mapped fields in the component, I’ll explicitly verify whether:
  - the page truly should be read-only, or
  - one or more fields were attached to the wrong neighboring page.

Validation plan
- After implementation, I will check the reported pages individually:
  - 1, 2, 5, 6, 8, 9, 12
- I will only mark the fix complete after those specific pages are visually verified one by one, not by sampling a couple of pages.

Expected outcome
- The reported pages are corrected independently.
- No more “one fix breaks another page” behavior from blanket coordinate shifts.
- We narrow the work to the exact problem pages you identified rather than reworking the entire 28-page file again.
