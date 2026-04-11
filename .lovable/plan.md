

## PDF Alignment Fix — Final Plan

Nothing is needed from you except to **approve this plan**. Once approved, I will:

1. **Extract exact line coordinates** from `public/templates/HCN_Application.pdf` using `pdfplumber` — programmatically reading every horizontal line position on all 28 pages
2. **Build a mapping script** that converts those raw PDF-point coordinates into the `xPct`/`yPct` percentages used by the component (accounting for bottom-left origin)
3. **Generate a test PDF** filled with sample data, convert each page to images, and visually verify alignment before touching any code
4. **Update `ApplicationFormFiller.tsx`** with the script-generated coordinates in a single pass — no guessing, no trial-and-error
5. **Re-generate and visually verify** the final filled PDF to confirm every field sits on its line

### Why this will work
Previous attempts manually guessed coordinate offsets. This time, the coordinates come directly from the PDF's own vector data — mathematically converted, not estimated.

### What changes
- `src/components/caregivers/ApplicationFormFiller.tsx` — field coordinate values only

### What you do
Just approve this plan. I'll handle everything else.

