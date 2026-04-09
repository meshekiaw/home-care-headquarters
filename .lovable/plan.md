

# Replace ElevenLabs with Browser-Based Text-to-Speech

## Problem
The ElevenLabs API requires a paid external API key and has been failing with authentication errors. Lovable AI only supports text chat completions and image generation — it does not offer text-to-speech.

## Solution
Use the browser's built-in **Web Speech API** (`SpeechSynthesis`) for narration. This is completely free, requires no API keys, and works in all modern browsers.

### Trade-offs
- **Pro**: Zero cost, no API key, instant playback, no storage needed
- **Con**: Voice quality is lower than ElevenLabs; voices vary by browser/OS; no pre-generated audio files

## Changes

### 1. Update `OrientationSection` component
Replace the `<audio>` element with `SpeechSynthesis` API calls. The play/pause/restart controls will drive `window.speechSynthesis` instead of an audio element. Track progress via the `onboundary` event and completion via `onend`.

### 2. Remove audio generation infrastructure
- Delete the `generate-orientation-audio` edge function
- Remove the "Generate Audio" / "Regenerate Audio" buttons from `OrientationManagement.tsx`
- Remove `audio_url` references from the management page (the DB column can stay; it just won't be used)

### 3. Remove ElevenLabs secret
The `ELEVENLABS_API_KEY` secret will no longer be needed.

## Files Modified
- `src/components/orientation/OrientationSection.tsx` — rewrite audio player to use SpeechSynthesis
- `src/pages/OrientationManagement.tsx` — remove audio generation buttons and related state
- `supabase/functions/generate-orientation-audio/index.ts` — delete

