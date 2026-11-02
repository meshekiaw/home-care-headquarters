# Roadmap

## Training resume
- [ ] Add ownership-checked server saves for video current/furthest positions and ungraded quiz drafts; preserve grading and completion lifecycle
- [ ] Restore video position and quiz answers, clear graded drafts for retakes, and show Continue for unfinished sessions
- [ ] Run focused rules/security tests and Test Caregiver-only cross-device save/readback checks; verify protected workflows remain unchanged

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
