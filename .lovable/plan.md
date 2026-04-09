

# Make Orientation Viewer Accessible

## Problem
The orientation viewer (`/lms/orientation/:id`) requires a caregiver ID in the URL and there are no links to it anywhere in the app. Users have no way to launch the orientation experience.

## Solution
Add two entry points:

### 1. "Preview Orientation" button on the management page
Add a button on `/lms/orientation` (OrientationManagement) that lets admins preview the orientation as a caregiver would see it. This will use a special preview mode (e.g. `/lms/orientation/preview`) that doesn't require a real caregiver ID.

### 2. "Start Orientation" link from the Completion Dashboard
In the progress table, add a clickable link on each caregiver's name that opens their orientation viewer (`/lms/orientation/{caregiver_id}`), so admins can see where a specific caregiver is in the flow.

### 3. Update OrientationViewer to handle preview mode
When the route param is `preview`, skip caregiver-specific progress tracking and just allow browsing through all sections with TTS narration.

## Files Modified
- `src/pages/OrientationManagement.tsx` — add "Preview Orientation" button and link caregiver names in progress table
- `src/pages/OrientationViewer.tsx` — handle `preview` as a special ID that skips DB progress tracking

