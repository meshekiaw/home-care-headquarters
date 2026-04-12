
Stop using credits on the current trial-and-error coordinate edits. I reviewed the code, and the real problem is bigger than “a few bad coordinates.”

### What’s actually causing this
The issue is centered in `src/components/caregivers/ApplicationFormFiller.tsx`.

1. The caregiver application is a **flat PDF**, not a native fillable form.
2. The export logic uses **hardcoded point anchors** in `APPLICATION_FIELDS` and then does:
   - `page.drawText(value, { x, y })`
3. That means the app has:
   - no true field boxes
   - no width fitting
   - no clipping
   - no shrink-to-fit
   - no overflow protection
4. I also found that `widthPct` exists in the field model, but the download logic does **not use it** when drawing text.
5. So even if one field is “close,” longer values can still visually spill into neighboring cells, especially on structured pages like:
   - W-4
   - I-9
   - Background check
   - initials/checkbox grids

That is why repeated coordinate-only fixes have not solved it.

### Recommended fix
I recommend we **stop patching coordinates** and switch to one of these two paths:

#### Best path: use a real fillable PDF
If you have the original fillable version of this application PDF, I should switch this flow to use native PDF form fields instead of manual coordinates. The project already has a reusable pattern for this in:
- `src/components/clients/UploadedPdfFiller.tsx`

This would be the most reliable fix.

#### If the PDF must stay flat
Then I should rebuild `ApplicationFormFiller` so it uses **box-based field rendering**, not single-point anchors.

That rebuild would include:
1. Replace “point only” placement with field boxes:
   - `xPct`, `yPct`, `widthPct`, and per-field fit behavior
2. Add text fitting rules:
   - clamp to width
   - shrink font for long values
   - optional multi-line where needed
3. Keep centered marks for:
   - checkboxes
   - initials
   - filing-status marks
4. Recalibrate only the truly structured pages first:
   - page 16
   - page 19
   - page 22
   - page 23
   - page 27
5. Add a clean test path so saved draft data does not confuse validation
6. Verify the exported PDF visually before calling it fixed

### What I would change
Likely files:
- `src/components/caregivers/ApplicationFormFiller.tsx`
- possibly `src/pages/CaregiverApplication.tsx` if I switch the screen to a more reliable filler flow

### What I need from you
Choose the fastest reliable route:

1. **Best option:** upload the original fillable version of the caregiver application PDF, if you have it.
2. **Otherwise:** approve a rebuild of the current flat-PDF filler using box-based rendering instead of more coordinate tweaking.

### Recommendation
My recommendation is:

- If you can provide the original fillable PDF, use that.
- If not, I should rebuild the current export logic once, properly, instead of spending more credits nudging numbers.

This is the point where “getting help” means changing the approach, not retrying the same coordinate edits again.
