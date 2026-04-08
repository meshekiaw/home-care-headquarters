

## Orientation Training Module for New Hires

The uploaded PowerPoint contains a 28-slide Home Care Network Employee Handbook Orientation covering foundations, work rules, care delivery, compliance, EVV, and closing acknowledgment. This plan builds a full interactive orientation experience within the existing LMS.

### What Gets Built

**1. New Database Tables**

- `orientation_modules` — stores orientation content sections (one row per slide/section), with fields for title, content (rich text from the PPTX), section_number, audio_url (for voiceover), and user_id. Admins can add/edit/reorder sections after initial creation.
- `orientation_progress` — tracks each caregiver's progress through the orientation: caregiver_id, module_id (links to the course), current_section, sections_completed (jsonb array of completed section numbers), video_watched (boolean per section), quiz_passed (boolean per section), completed_at, confirmed_at (acknowledgment timestamp).
- `orientation_quizzes` — stores quiz questions per section: section_number, question_text, options (jsonb), correct_answer, points. Reuses the pattern from `lms_quiz_questions` but scoped to orientation sections.

All tables get RLS policies scoped to `auth.uid() = user_id`.

**2. Orientation Content Seeding**

Parse the 28 slides into ~8 logical sections matching the PPTX roadmap (Foundations, Work Rules/HR, Care Delivery, Compliance/EVV, etc.). Each section gets:
- Extracted text content rendered as structured HTML
- Auto-generated quiz questions (3-5 per section) covering key policy points from the slide content
- A placeholder audio_url field for voiceover (generated via ElevenLabs)

**3. ElevenLabs Voiceover Integration**

- Create an edge function `generate-orientation-audio` that takes section text and calls ElevenLabs TTS API to generate narrated audio
- Store generated audio in a new `orientation-audio` storage bucket
- Use a professional voice (e.g., "Sarah" — EXAVITQu4vr4xnSDxMaL) for narration
- Requires the `ELEVENLABS_API_KEY` secret (will prompt you to add it)

**4. Interactive Orientation Viewer Page** (`/lms/orientation/:assignmentId`)

A step-by-step module where the caregiver must:
1. **Watch/listen to each section** — audio plays with slide content displayed; a progress bar tracks playback. The "Next" button is disabled until the audio finishes (enforces "completely watched" requirement).
2. **Pass the section quiz** — after the content, 3-5 multiple-choice questions appear. Must score the passing threshold to proceed.
3. **Repeat if needed** — failed quizzes can be retried; the section must be re-watched before retaking.
4. **Final confirmation** — after all sections are completed, a digital acknowledgment screen with a signature pad confirms orientation completion. This records `confirmed_at` in `orientation_progress`.

Progress is saved per-section so caregivers can resume where they left off.

**5. Admin Orientation Management Page** (`/lms/orientation`)

- View all orientation sections with content preview
- Edit section content (title, body text) — fulfills "add updates" requirement
- Re-generate voiceover for updated sections
- View completion dashboard: which caregivers have completed, are in-progress, or haven't started
- Add/remove/reorder quiz questions per section

**6. Completion Tracking**

- The existing `lms_assignments` table links caregivers to the orientation course
- `orientation_progress` stores granular section-by-section status
- Completion triggers an update to the assignment status ("completed") with a score
- Admin can view confirmation records (who completed, when, with digital signature)

**7. Routing and Navigation**

- Add `/lms/orientation` route for admin management
- Add `/lms/orientation/:id` route for the caregiver viewer
- Add an "Orientation" link/tab in the LMS Training page sidebar or as a prominent card

### Technical Details

**Files to create:**
- `src/pages/OrientationManagement.tsx` — admin section management
- `src/pages/OrientationViewer.tsx` — caregiver step-by-step viewer
- `src/components/orientation/OrientationSection.tsx` — single section display with audio player
- `src/components/orientation/OrientationQuiz.tsx` — quiz component with scoring
- `src/components/orientation/OrientationConfirmation.tsx` — final acknowledgment with signature
- `src/components/orientation/OrientationProgressBar.tsx` — overall progress indicator
- `src/components/orientation/EditSectionDialog.tsx` — admin edit dialog
- `src/hooks/useOrientation.ts` — data hook for orientation modules/progress
- `src/data/orientationContent.ts` — initial content extracted from PPTX (28 slides → 8 sections)
- `supabase/functions/generate-orientation-audio/index.ts` — ElevenLabs TTS edge function

**Database migrations:**
- Create `orientation_modules`, `orientation_progress`, `orientation_quizzes` tables with RLS
- Create `orientation-audio` storage bucket

**Secret required:**
- `ELEVENLABS_API_KEY` — needed for voiceover generation

