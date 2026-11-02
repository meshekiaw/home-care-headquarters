# Architecture rules

- In-service resume uses ownership-checked video RPCs with timestamp-ordered positions and monotonic watch credit, plus per-answer quiz drafts cleared atomically on attempt insertion; keep drafts separate from grading and hour accounting.
- Training course shells stay outside the player component so autosave/state renders cannot remount playback or lose quiz focus.

- Training sign-in requests use the public caregiver-training-sign-in gateway with service-only email lookup and atomic link/role RPCs; confirmed users receive magic links, unconfirmed admin-created users receive confirmation resends, mailbox verification gates sessions, duplicate/conflicting links fail closed, and protected admin/nurse roles remain unchanged.
- Explicit one-time account maintenance uses Auth Admin APIs without passwords or email calls and the existing atomic caregiver link RPC; temporary privileged endpoints must be secret-authenticated, time-limited, and removed after verification to avoid leaving maintenance access live.
- Custom authentication emails use the scaffolded managed auth-email-hook unchanged; customize templates without replacing SDK signature verification or dispatch.
- App notification sends run synchronously in their existing feature functions through the managed template helper, or the shared direct API adapter for pre-existing composed HTML; retained email audit tables never gate sending, and terminal-event writes deduplicate by event-derived primary key.

- Caregiver-record password changes use a dedicated authenticated admin-only Edge Function that resolves the linked caregiver-only login server-side and audits outcomes without passwords; existing email, roles and links remain unchanged, and the admin session is never replaced.
- Keep caregiver onboarding independent of applications, policy acknowledgments, orientation and scheduling; read existing orientation completion without changing its lifecycle.
- Route all caregiver-document file operations through the authenticated caregiver-documents Edge Function; deny direct Storage access so every read rechecks roles and ownership and admin reads cannot bypass the view log.
- Use single-use, user-bound, 60-second document access tickets rather than transferable Storage signed URLs; never return storage URLs or paths as public links.
- Keep onboarding history and document view logs append-only, retain records with history, and keep office notes admin-only.
- Preserve deprecated maltreatment date columns and synchronize them with the corrected check-date columns; generated expiration columns are the authoritative warning dates and cannot be manually written.
- Keep background check expiration as a database-generated column; displays and exports read the stored value, while CSV example dates mirror the calculation and imports never write it.
- Initialize caregiver onboarding atomically on caregiver creation, with existing caregivers exempt; onboarding must not change cleared-to-schedule enforcement.
- Run pure caregiver date and document-access rules with `bunx vitest run --config vitest.rules.config.ts`; these rules do not need a browser or the optional native canvas dependency.
- Resolve portal caregivers by the authenticated user and share that query between navigation and onboarding; exempt caregivers never receive onboarding controls.
- Onboarding reads application/policy receipts through one-way synchronization; personal/certificate saves use ownership-checked atomic RPCs and private uploads enforce file limits under the step lock without changing source workflows.
- Admin onboarding review and office date/approval changes use atomic admin-only RPCs with an append-only private event ledger so evidence changes retain their actor and note.
- Certificate credentials reference private document IDs with server-side link validation; all previews use logged gateway bytes and revocable browser blob URLs, never stored Storage links.
- Office replacements archive the predecessor and record the required note atomically; approval is retained until the admin explicitly saves and reapproves the step.