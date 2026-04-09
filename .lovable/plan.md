
# Optimize Browser Voice for Softer, Professional Sound

## Changes in `src/components/orientation/OrientationSection.tsx`

### 1. Refine voice selection
Update the `useFemaleVoice` hook to prefer higher-quality, softer-sounding US English voices. Prioritize in order:
- "Samantha" (macOS — warm, professional)
- "Microsoft Zira" (Windows — soft, clear)
- "Google US English" (Chrome — neutral, smooth)
- Any other `en-US` female voice

### 2. Tune utterance parameters for a softer delivery
In `createUtterance`, adjust:
- **Rate**: `0.9` (slightly slower for a calmer feel, down from `0.95`)
- **Pitch**: `1.05` (slightly higher for warmth)
- **Volume**: `0.85` (slightly softer, less harsh)

These small tweaks make the browser voice sound noticeably more pleasant and professional without any external dependency.

## File Modified
- `src/components/orientation/OrientationSection.tsx`
