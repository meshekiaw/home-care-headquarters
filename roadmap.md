# Roadmap

## Client List sorting
- [ ] Add three-state sorting to every data heading and synchronize the existing dropdown without changing columns, tabs, filters or data
- [ ] Verify actual-date sorting, blanks last, exact status/progress ranks and stable search/filter/tab behavior using synthetic data only and no sign-ins

## Client authorization progress
- [x] Added separate authorization milestones, actual pipeline/618 appointment times and completion dates, admin-only decisions and append-only actor-stamped history; deadlines never become appointment dates and pending renewals retain completed progress
- [x] Added record/Edit controls, list column/counted filter and pipeline display, orange Waiting 15+ days and Test exclusion without changing existing fields or assessment rules
- [x] Verified synthetic database/controls and desktop/phone browser save/readback/history/filter/denial/clear/Edit flows without sign-in or live writes; original clients, assessment fields and status history retain matching fingerprints; non-Test counts: Not started 10, all five other steps 0, authorization dates blank, six Test clients excluded
- [ ] Live authenticated admin save remains untested because the user prohibits all sign-ins

## Client field consolidation and Test exclusion
- [x] Consolidated canonical Payer Type/Status with exact authorized mapping; retained schedules/dates and all three original history events; removed duplicate payer data, retired legacy storage for live-version safety, enforced admin-only changes
- [x] Updated forms/cards/filters/counts/imports/exports/scheduling/assessment queues; restrictive Test parent policies cover existing records, nurse RPCs and seven deployed service functions exclude Test without deleting historical work
- [x] 334 isolated tests passed; synthetic desktop/phone list/Test isolation, Payer Type filter, Other/status save and UI history readback, retained schedule, pipeline and Test intake verified with zero page errors and no sign-in/live test records; build OK
- [x] Verified old Status: Active 10/Pending 6; old Client status: Not set 13/Hospitalized 3; new Status: Not set 7/New client 6/Hospitalized 3/all others 0; Payer Type populated 16 before/after (Medicaid 9/VA 7); preserved-data and original-history fingerprints unchanged
- [ ] Live authenticated admin save remains untested because all sign-ins are prohibited; physical retirement of unused compatibility columns requires a later allowed breaking schema change

## Client payer, requested schedule and status
- [x] Added independent admin-only fields and immutable, actor-stamped status history; all 16 existing clients start Not set and their complete legacy-data fingerprint is unchanged
- [x] Added fields to New Intake, Add New Client, Edit and client record; payer/status/schedule cards, multi-payer filter and counted status tabs; pipeline columns and assessment rules preserved
- [x] 266 isolated tests passed; synthetic desktop/phone list filters, record save/readback/history, Edit round-trip and Intake-to-pipeline verified; disposable test data removed, no live client writes or any sign-ins; build OK
- [ ] Live authenticated admin save remains untested because admin and real-user sign-ins are prohibited

## Admin caregiver sign-in access
- [x] Added admin-only record access status beside profile controls, exact name/email confirmation and append-only access history, plus all four roster filter states
- [x] Deployed dedicated admin-authenticated gateway; confirmed/passwordless creation without email, service-only atomic role/link/12-session/audit repair preserves admin roles and refuses nurse/conflicting caregiver links
- [x] 216 isolated tests passed, build OK; synthetic desktop/phone confirmation, cancel, Ready/history and disabled nurse conflict verified; deployed unsigned requests return 401 and only test-caregiver@example.invalid used for signed-in 403/status-read denial; zero live access events and no real caregiver changes
- [ ] Actual signed-in admin provisioning awaits the user's check; admin sign-in is prohibited for testing

## Training phone playback
- [x] Confirmed app warns at 13 minutes/signs out at 15; playback was not activity and no wake lock existed. Shorter phone sleep is plausible, not proven without the reporting phone; no real accounts accessed
- [x] Visible playing training gets race-safe wake lock and activity heartbeat only; pause/end/leave stop protection, leave saves before pause, returning requires Play; existing timeout elsewhere unchanged
- [x] Both YouTube course paths use privacy-enhanced host and rel=0 with exact portal-only credit notice, no branding covers; native/other course playback protected without changing completion semantics
- [x] All 176 isolated tests passed; Test Caregiver-only phone/desktop simulated player switch/pause/new Play and actual server 0:12 save/readback verified, synthetic watch seconds restored to zero; build OK
- [ ] Physical-phone sleep behavior and real YouTube playback remain unverified: actual embed loaded with intact logo, but YouTube blocked automated playback with its bot-verification screen

## 618 witness-name correction
- [x] Second-witness name opens empty; client same-person name reuse and all other forms unchanged
- [x] Case/whitespace-normalized Section IV witness match blocks UI completion and draft-to-signed database transitions with the exact requested message
- [x] Read-only audit: zero matching-witness forms across three completed versions (two signed, one superseded); all five forms and fifteen signatures have unchanged fingerprints
- [x] Twelve focused tests and all 160 isolated regression tests passed; synthetic browser handoff, separate saved names, successful distinct-witness completion and exact matching-witness error verified; no account/sign-in or live data writes; build OK

## Notification sender correction
- [x] Whole-project sender and attempt audit: no remaining placeholder senders; retained ledger has one failed LMS assignment notice, one failed magic link, and one unclassified system bounce; named notification types have no recorded email-not-sent rows; provider logs cannot establish inbox delivery
- [x] All visible From headers use noreply@notify.homecareheadquarters.org; block pre-request historical resends, manual appointment replays, LMS assignment notices and stale creation-notice backlog without changing recurring reminder windows, recipients or message content
- [x] 148 isolated tests passed; deployed twelve affected functions including shared-helper consumers and preview; unsigned live old-record request returned skipped before any send/write; notification and nurse-assessment fingerprints unchanged; build OK; no sign-in, live send, retry job, or historical data modification

## Training resume
- [x] Ownership-checked server saves for separate current/furthest video positions and ungraded quiz drafts; grading, hour accounting and completion lifecycle unchanged
- [x] Restored video welcome/restart and quiz first-unanswered focus; graded drafts clear atomically, retakes blank, existing In progress/Continue retained and My Training link corrected
- [x] 135 isolated tests passed; only test-caregiver@example.invalid used for real cross-device answer/save readback, failed grading/blank retake and offline retry; simulated third-party player exercised actual 10-second, pause, restart, pagehide saves and skip guard; temporary test assignment removed
- [ ] Actual YouTube playback verification blocked by unavailable YouTube connection in automated browser; player errors now show Retry instead of a blank indefinite wait

## One-time caregiver account connection
- [x] Inventory active email matches, explicit skips and unmatched accounts: 173 active, 128 new accounts needed, six existing connections needed, 37 explicit skips; no eligible protected-role conflicts
- [x] Created 128 confirmed passwordless accounts without email, connected six existing matching accounts and added caregiver roles; Johneise was already confirmed and left confirmed
- [x] Verified 136 of 173 active caregivers connected with caregiver role; 37 explicit skips and 11 unmatched accounts unchanged; all existing auth rows/passwords/sign-in activity, caregiver details and protected training/onboarding records unchanged; temporary endpoint removed, 111 isolated tests passed

## Email update
- [x] Inventory all legacy email surfaces, retained-table writes and constraints; no provider conflicts or unmappable app behavior
- [x] Re-render authentication emails, preserve template copy, convert notification sends and add retry-safe outcome recording; 105 isolated tests passed and replacement functions checked
- [x] Verify replacements, deploy thirteen affected functions, remove old email files from source only, and leave unpublished for review; build OK, public pages checked without sign-in, actual adapters exercised with intercepted synthetic sends
- [ ] Real email delivery/redemption awaits a deliverable Test Caregiver mailbox; no live email was sent and no account was signed in during this update

## Caregiver training sign-in
- [x] Server-checked active caregiver email matching and on-request login/link/role repair with admin/nurse protection; deployed service-only atomic helpers
- [x] Training sign-in plain unmatched-email and email-rate-limit messages; both verified on the public sign-in page
- [x] Verified-domain auth email sending enabled as noreply@notify.homecareheadquarters.org; exact hourly-limit settings instructions delivered without changing unknown global auth settings
- [x] 95 isolated rule tests passed, including database role/link rules; Test Caregiver-only authenticated portal verified, no real account creation or admin sign-in
- [ ] Email-link redemption/new-login end-to-end check awaits a deliverable Test Caregiver mailbox: link request now succeeds, but email delivery correctly blocks example.invalid; Test Caregiver has no training assignments

## Caregiver temporary password
- [x] Admin-only Set temporary password beside Edit Profile on the caregiver record, shown only for linked logins; no email reset
- [x] Server-resolved caregiver-only target, protected admin/nurse logins, explicit confirmation, password-free outcome auditing
- [x] 68 tests passed including 25 new isolated password tests; deployed endpoint rejects unsigned requests (401); no sign-in or live caregiver account changes
- [ ] Live admin password-reset check not performed: user prohibits all sign-ins and real login/password changes

## Admin caregiver onboarding tab
- [x] Admin-only tab with twelve grouped steps, dates, approver, logged in-app file viewer and history
- [x] Approve/send-back/paper approval, original-seen date and optional linked certificate credential
- [x] Office uploads/date save+approval, noted file replacement, onboarding-required switch (retains existing steps and history)
- [x] 43 rule tests passed without any sign-in or caregiver record changes
- [ ] Admin approval/upload/view end-to-end checks reserved for the user's testing; no admin sign-in permitted

## Caregiver portal onboarding
- [x] Caregiver-only page/menu for onboarding-required records, seven visible steps with progress and statuses
- [x] Personal/emergency contact save; one-way application/policy receipt sync and existing automatic orientation approval; source workflows unchanged
- [x] Private ID/SS card/certificate uploads: PDF/JPG/PNG/HEIC, 10 MB, two files, camera, resubmission and approved locks
- [x] 27 rule tests and actual Test Caregiver portal save/readback, two-file upload/download, server rejection of third file, certificate exemption, approved-save denial, sent-back replacement and phone fit verified; no real staff sign-in/record changes
- [x] Application-finished confirmation submits step 1 without changing My Application; prior Test Caregiver verification completed
- [ ] Policy acknowledgment end-to-end check awaits a published policy (none currently published); do not publish synthetic agency-wide policy for testing

## Background check expiration
- [x] Add automatic read-only five-year expiration without changing existing background check dates
- [x] Show expiration on caregiver records, Caregivers list/warnings, and CSV export
- [x] Verify unchanged check-date count/fingerprint (169) and matching expiration count (169); 18 rule tests passed; Test Caregiver-only isolated profile/roster and actual CSV download verified without changing dates or roles (admin routes not exercised)

## Caregiver onboarding foundation
- [x] Separate private caregiver document store, controlled file access and immutable admin view log
- [x] Twelve ordered onboarding steps with status history and file links; no new screens
- [x] Emergency contact fields and new/existing caregiver onboarding requirement defaults
- [x] Preserve child/adult maltreatment check dates, derive two-year expirations, update existing date displays/import/export/warnings
- [x] Verify caregiver access restrictions and before/after date counts (admin file-open check not exercised: test caregiver role only)
- [x] Test only the dedicated “Test Caregiver” record with onboarding required; report test-caregiver@example.invalid

## 618 Assessment Form
- [x] Form record structure attached to an assessment: draft/signed/amended, versioning, autosave
- [x] Multi-party signatures: nurse, client, client representative, witness — each with name, role, attestation, audit trail
- [x] Content fingerprint covering all signatures on the final document
- [x] Client signing mode: single locked screen, no navigation, nurse re-confirm to exit
- [x] Unable/refused-to-sign handling with documented reason + representative/witness fallback
- [x] Signed status blocked until all required signatures captured (database-enforced)
- [x] RLS + signed-record immutability + audit logging on new tables
- [x] Payer Type on clients (Medicaid default / VA), editable, shown on record, filterable on list
- [x] Completion sets 618 date + expiration (1 year) in the database, audit-logged, assessment marked Completed; amendments don't re-set dates
- [x] VA six-month Nurse Visit: due date on client, second assessment type, 30-day auto-create, PHI-free emails + 14/7-day reminders, admin Type filter
- [x] Nurse Visit form fields
- [x] Actual 618 form fields
- [x] PDF export and 618 history on the client record

## Annual In-Service Video Training
- [x] 12 numbered in-service sessions (title, description, video link, quiz); Session 2 link set
- [x] Admin-only video links (separate table + RLS), embedded playback, no URL on caregiver screen
- [x] Passing score 70%, editable per session from admin
- [x] Quiz attempt history retained (every attempt, pass/fail, timestamp); completion date = passing attempt
- [x] Completion tracking admin view filterable by caregiver and session
- [x] Shareable per-session links into the app with sign-in redirect

## Hire-date in-service tracking
- [x] Hire-date driven 12-hour annual in-service period, status colours, roster filter/sort, CSV columns
- [x] Hire date required when adding a caregiver; editable with confirmation on the In-Service tab
