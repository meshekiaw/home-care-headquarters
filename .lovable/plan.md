

# American English Voice + Colorful Slide Backgrounds

## Changes

### 1. American English voice preference (`OrientationSection.tsx`)
Update the `useFemaleVoice` hook to prioritize American English voices. Change the keyword list to favor US English voices and add a `lang` filter for `en-US`:
- First try: voices where `lang === "en-US"` and name matches female keywords ("samantha", "google us english", "zira", "victoria")
- Fallback: any `en-US` voice
- Remove UK-specific entries ("google uk english female", "moira", "fiona", "karen")

### 2. Colorful content background (`OrientationSection.tsx`)
The card headers already have gradient colors. Add a subtle colored background to the **entire card content area** (not just the narration player) using each section's `theme.light` class on the `<CardContent>` wrapper, so the whole slide feels colorful rather than plain white.

## Files Modified
- `src/components/orientation/OrientationSection.tsx` — voice filter update + content area background color

