

## PDF Alignment Fix — Evidence-Based Approach

### What the Filled PDF Reveals

Parsing the uploaded `HCN_Application_Filled_7.pdf` shows data landing in **wrong cells**, not just slightly offset. Examples:

**Page 19 (I-9 Form):**
- "Other Last Names Used" column shows "AR 71603" — that's the ZIP code, not a name
- Address row: "Pine Bluff" appears in the Apt Number column, "smithminnie@gmail.com" in City, "870-643-4194" in State
- This means the I-9 fields are horizontally AND vertically misaligned — data is bleeding into adjacent cells

**Page 16 (W-4):**
- Text appears to render but the filing status checkbox marks may not land in the correct boxes

### Root Cause

The coordinates in `APPLICATION_FIELDS` were never extracted from the actual PDF. They were manually estimated, then repeatedly patched with blanket offsets. The download code is straightforward (`x = width * xPct`, `y = height * yPct`) — the math is correct, but the input percentages are wrong.

### The Fix — Using the PDF Skill Toolkit Scripts

This time, I will use the purpose-built scripts that extract ground-truth coordinates directly from the PDF template. No guessing.

**Step 1:** Run `extract_layout_structure.py` on `public/templates/HCN_Application.pdf` to get exact PDF-point coordinates for every text label, line, and checkbox on all 28 pages.

**Step 2:** Run `render_pages_to_images.py` to create reference images of each page.

**Step 3:** For each field in `APPLICATION_FIELDS`, match it to the extracted structure:
- Find the label text (e.g., "Last Name") in the structure data
- Calculate the entry area as `label.x1 + 5` horizontally
- Use the row boundary line for vertical positioning
- Convert to percentages: `xPct = x / page_width`, `yPct = (page_height - y) / page_height` (pdf-lib uses bottom-left origin)

**Step 4:** Use zoom crops on critical pages (1, 16, 19, 22, 23, 27) to verify coordinates precisely.

**Step 5:** Generate a test PDF with sample data using `annotate_form_entries.py`, convert to images, and visually verify every page.

**Step 6:** Update `ApplicationFormFiller.tsx` with verified coordinates in a single pass.

### What Changes
- `src/components/caregivers/ApplicationFormFiller.tsx` — all `xPct`/`yPct` values in `APPLICATION_FIELDS`, `W4_FILING_STATUS_MARKS`, and `TB_Q5_OPTION_MARKS`

### Why This Will Work
Previous attempts estimated coordinates and applied uniform offsets. This approach extracts the actual vector geometry from the PDF template, matches each field to its specific label/row, and visually verifies the output before writing any code. The scripts handle coordinate conversion automatically.

### What You Need To Do
Nothing — just approve this plan.

