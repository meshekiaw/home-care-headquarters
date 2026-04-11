

## PDF Alignment Fix — Root Cause Analysis and Plan

### What I Found

After reviewing the code, the uploaded filled PDFs, and the PDF skill toolkit, here is the root cause:

**The coordinate extraction and conversion pipeline has a fundamental methodology problem.** Previous attempts used `pdfplumber` to extract horizontal lines, then applied a formula (`yPct = 1 - (pdfplumber_y / 792)`) with manually-guessed baseline offsets (+0.003 for text, +0.005 for checkboxes, +0.012 for some pages). These offsets are inconsistent across the 28 pages because:

1. Different pages have different line spacing, row heights, and label positions
2. The offsets were applied uniformly rather than per-field
3. Each "fix" iteration shifted all fields by a blanket offset, fixing some while breaking others
4. No visual verification was done against the actual PDF before updating the code

### The Correct Approach

The PDF skill toolkit has purpose-built scripts that solve this exact problem. Instead of extracting raw lines and guessing offsets, the plan is:

**Step 1: Extract full layout structure** using `extract_layout_structure.py` — this gives exact coordinates for every text label, horizontal line, and checkbox rectangle, with proper row boundaries.

**Step 2: Render all 28 pages to images** using `render_pages_to_images.py` — for visual cross-reference.

**Step 3: For each field in `APPLICATION_FIELDS`, match it to the extracted structure** by finding the corresponding label text and its adjacent entry area. Calculate the entry coordinate as `label.x1 + 5` (horizontal) and use the row boundary for vertical positioning.

**Step 4: Convert structure coordinates to pdf-lib percentages** using the actual page dimensions from the PDF (not assuming 792pt). The formula: `yPct = (page_height - structure_y) / page_height` where `structure_y` is the TOP of the entry area, adjusted down by font ascent so the baseline lands on the line.

**Step 5: Generate a test PDF** with sample data, convert to images, and visually verify EVERY page before updating the code.

**Step 6: Update `ApplicationFormFiller.tsx`** with verified coordinates in a single pass.

### What Changes
- `src/components/caregivers/ApplicationFormFiller.tsx` — all `xPct`/`yPct` values in `APPLICATION_FIELDS`, `W4_FILING_STATUS_MARKS`, and `TB_Q5_OPTION_MARKS`

### Why This Will Work
Previous attempts extracted partial data (just lines) and guessed offsets. This approach uses the complete layout structure (labels + lines + checkboxes + row boundaries) and visually verifies every page before writing any code. No guessing.

