## Goal

When an administrator assigns an LMS course, the caregiver immediately sees it on their dashboard, receives an email (and optional SMS), can log in (auto-provisioned if needed), complete the training, earn a certificate, and have completion tracked for admin compliance reporting.

## 1. Database changes (one migration)

**Add columns to `lms_assignments`:**
- `progress_percentage int default 0`
- `started_at timestamptz`
- `certificate_url text` (storage path)
- `notification_sent_at timestamptz`

**Add columns to `caregivers`:**
- `temp_password_sent_at timestamptz` (audit only)

**New storage bucket:** `lms-certificates` (private, RLS: admins all, caregivers read own).

**RLS additions** so caregivers see/update their own assignments:
- `SELECT lms_assignments` where `caregiver_id IN (SELECT id FROM caregivers WHERE auth_user_id = auth.uid())`
- `UPDATE lms_assignments` same scope (status, progress, completed_at, score)
- Similar `SELECT` on `lms_courses` for active courses they are assigned to.

## 2. Edge functions

**`send-lms-assignment-notification`** (new) — called after assignment insert:
- Input: `assignment_ids[]`
- For each: load caregiver + course; if no `auth_user_id` and caregiver has email, generate temp password (`crypto.randomUUID().slice(0,12)`), call admin createUser, assign `caregiver` role, link to caregiver record, and include credentials in email.
- Sends Resend email: course title, due date, login link (`${SITE_URL}/login`), and (when newly provisioned) temp password with "change after login" notice.
- Optional Twilio SMS if `TWILIO_*` secrets exist and `caregivers.phone` set — short message with course + due date + login URL. Silently skipped if Twilio not configured.
- Marks `notification_sent_at`.

Updates `AssignCourseDialog` → after `assignCourse` succeeds, invoke this function with the new assignment IDs.

## 3. Caregiver dashboard

Update `src/pages/CaregiverDashboard.tsx` to add an **"My Training"** card and a new section listing assignments grouped by status:
- Assigned (pending)
- In Progress
- Completed (with date + score + certificate download link)

New page `src/pages/CaregiverTraining.tsx` (route `/my-training`) — full list with: course title, description, due date, status badge, progress bar, "Start / Continue / Review" button, and "Download Certificate" when completed.

Course launcher reuses the orientation viewer for `content_type='orientation'` courses; for `document` courses opens content_body in a viewer with a "Mark complete" action that sets `status='completed'`, `completed_at=now()`, `progress_percentage=100`, and triggers certificate generation.

## 4. Certificate generation

Reuse `src/utils/orientationCertificatePdf.ts` pattern → new `src/utils/lmsCertificatePdf.ts` that produces a per-course PDF (caregiver name, course title, completion date, score). On completion, upload to `lms-certificates/${caregiver_id}/${assignment_id}.pdf` and store path in `assignments.certificate_url`. Admin assignments table gets a "Certificate" column with download link.

## 5. Admin compliance view

Extend the existing assignments table in `src/pages/LmsTraining.tsx`:
- Add "Progress" column (percent bar)
- Add "Certificate" column (download icon when present)
- Per-assignment "Resend notification" action (re-invokes the edge function)

No separate compliance page — existing stats cards already cover totals/overdue/in-progress/completion rate.

## 6. Secrets

- `RESEND_API_KEY` — already configured by other email functions; if missing the function returns a clear error.
- `RESEND_FROM_EMAIL` — already used elsewhere.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — optional; SMS is skipped when absent. Will request via `add_secret` only if you want SMS enabled now.

## Out of scope

- Email templates branded via Lovable Emails infrastructure (uses existing Resend pattern to match the rest of the project).
- Quiz delivery for non-orientation courses (existing orientation quiz flow continues to apply for orientation-type courses).
- Password-change-on-first-login enforcement (caregiver can change password in profile).

## Approval needed

Confirm:
1. SMS via Twilio — set up now (you provide credentials) or leave as a no-op for later?
2. Temp password length 12 chars OK?
3. Should completing a course auto-issue the certificate, or require admin approval first?
