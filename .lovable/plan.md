

# Female Voice + Colorful Orientation Slides

## Changes

### 1. Female voice preference (`OrientationSection.tsx`)
In `createUtterance`, after creating the utterance, search `window.speechSynthesis.getVoices()` for a female voice. Most browsers label female voices with names containing "Female", "Samantha", "Zira", "Google UK English Female", etc. Pick the first match; fall back to default if none found. Load voices on `voiceschanged` event since they load asynchronously.

### 2. Colorful section cards (`OrientationSection.tsx`)
Add a `sectionNumber` prop and use it to pick from a rotating palette of gradient backgrounds for each section card. Each section gets a distinct, attractive color theme:
- Section 1: Blue gradient header
- Section 2: Purple gradient
- Section 3: Teal/cyan gradient
- Section 4: Rose/pink gradient
- Section 5: Amber/orange gradient
- Section 6: Emerald/green gradient
- Section 7: Indigo gradient
- Section 8: Sky blue gradient

The card header gets the gradient background with white text, the narration player gets a lighter tinted background, and the content area stays clean white for readability.

### 3. Pass section number from viewer (`OrientationViewer.tsx`)
Add `sectionNumber={currentSection}` prop to `<OrientationSection>`.

### 4. Progress bar color enhancement (`OrientationProgressBar.tsx`)
Use the same color palette for each step dot/bar segment so the progress bar is colorful and matches the section themes.

## Files Modified
- `src/components/orientation/OrientationSection.tsx` — female voice selection + gradient card styling
- `src/pages/OrientationViewer.tsx` — pass `sectionNumber` prop
- `src/components/orientation/OrientationProgressBar.tsx` — colorful step indicators

