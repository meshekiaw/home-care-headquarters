# Annual In-Service Video Training (12 Sessions)

## What you get

**Twelve numbered sessions** set up as training modules, each with a title, description, video link, and a quiz. Session 2 (Fall Prevention & Safety) gets the link you supplied; the other eleven start with no link and show "Video coming soon" until you add one.

1. Infection Control & Hand Hygiene
2. Fall Prevention & Safety
3. Client Rights & Dignity
4. HIPAA & Confidentiality
5. Abuse, Neglect & Exploitation
6. Emergency Procedures & Responding to 911 Situations
7. Medication Reminders (Non-Administration)
8. Body Mechanics & Injury Prevention
9. Nutrition & Meal Preparation
10. Documentation & Care Plans
11. Dementia & Alzheimer's Care
12. Mental Health & Behavioral Support

**Admin side (In-Service tab in Training)**
- One row per session, numbered in order, showing whether a video link is set.
- Paste or change a session's video link at any time; edit title, description, and duration too.
- Quiz editor per session: add, edit, reorder, and remove questions. Each session ships with a short starter quiz you can rewrite.
- Copy shareable link button per session.

**Caregiver side**
- Video plays embedded inside the training page; no file uploads anywhere in the app.
- Must be signed in as a caregiver before the page will load.
- The raw YouTube address is never sent to the caregiver's browser or shown in page text, and the player runs with sharing, related videos, and the YouTube title link turned off.
- Quiz appears after the video; passing marks the session complete with the date.

**Completion tracking (admin)**
- Table of who has completed what: caregiver, session, status (assigned / in progress / completed), date completed, score.
- Filter by caregiver and by session, plus a status filter and CSV export.

**Shareable links**
- Each session gets a link to your app, e.g. `https://homecareheadquarters.org/training/session/2`.
- Opened while signed out, it sends the person to sign-in and then straight into that session.
- If the caregiver isn't assigned that session yet, opening the link assigns it to them automatically so their progress is tracked.

## Honest limitation on hiding the video

The address never appears as text, in a link, or in any share menu, and only admins can read it from the database. But any embedded player has to identify the video to YouTube, so a determined person using browser developer tools could still recover the ID. True lock-down would require re-hosting the videos behind signed access, which is outside what unlisted YouTube can do. Unlisted + hidden embed is the practical ceiling here.

## Technical notes

- Migration: `lms_courses.session_number int` (unique where not null); new admin-only table `public.lms_session_videos (course_id, provider, video_id, video_url, updated_by, updated_at)` with RLS restricted to `has_role(auth.uid(),'admin')` and grants to `authenticated`/`service_role` only — caregiver clients cannot select it.
- Security-definer function `get_session_video(p_assignment_id uuid)` returns only `{provider, video_id}` after confirming the calling user owns that assignment via `caregivers.auth_user_id`; audit-logged through the existing trigger pattern.
- Data seeding (12 courses, starter quiz questions, Session 2 link) runs through data queries, not the migration.
- Admin UI: new `src/components/lms/InServiceSessionsTab.tsx` + `SessionVideoDialog.tsx` + `SessionQuizDialog.tsx`, mounted in `src/pages/LmsTraining.tsx`; completion matrix in `src/components/lms/SessionCompletionTab.tsx`.
- Caregiver: `LmsCoursePlayer` switches to `get_session_video` for in-service courses and renders `youtube-nocookie.com/embed/<id>?rel=0&modestbranding=1&disablekb=1` with no anchor or URL text.
- New route `/training/session/:sessionNumber` → `src/pages/SessionRedirect.tsx`: resolves session, requires caregiver session (redirects to `/login?redirect=/training/session/2`), ensures assignment exists, forwards to `/my-training/:assignmentId`. `Login` honours the `redirect` param.
- Grading stays in the existing `lms-course-quiz` edge function (server-side answers, 80% pass).
