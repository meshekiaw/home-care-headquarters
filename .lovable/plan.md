# 618 Assessment Form — Record Structure & Signing

Answers to your questions first, then what I'll build in this step.

## Your questions

**Where should the completed form live?**
Both, with one source of truth. The form record is owned by the assessment (one form per assessment), and the client record shows a read-only list of every 618 form for that client with status, signer and date. That way a nurse works inside the assessment, while the client file stays the complete history — no duplicated copies that can drift apart.

**Legally defensible signature + audit trail**
Follow the same approach already used for the admission/nursing forms, tightened:
- Typed full name plus a drawn signature captured on screen.
- A checkbox attestation ("I certify the information is accurate...") recorded as explicit consent text stored with the signature.
- Recorded at signing time: signer name, signer account, role, exact timestamp, IP address, browser/device string, and the exact form content that was signed (a snapshot plus a fingerprint of it). If the content is ever changed later, the fingerprint no longer matches the snapshot, which is provable.
- Every signature row is insert-only: it can never be edited or removed, by anyone, including admins.

**Locking after signing, while allowing corrections**
Once signed, the form flips to `signed` and the database itself blocks any change to the answers — not just the screen. A correction is not an edit: it creates a new numbered amendment (version 2, 3, ...) that must state a reason and be signed again. The original stays permanently readable. This mirrors how paper charts handle late entries.

**Partial saves**
Yes. A form starts as a draft the moment the nurse opens it, autosaves as they work (roughly every few seconds after a change, plus on leaving the page), and shows "Saved just now". A nurse can close it and pick it up on any device. Drafts are only visible to the assigned nurse and admins.

**PDF export**
Yes. Any signed form can be downloaded as a PDF containing the answers, the signature image, and a footer with signer, timestamp, device, and version number — suitable for submission and for the client file. Draft PDFs are watermarked "DRAFT — NOT FOR SUBMISSION". The export is built once the fields exist; this step puts the data in place for it.

## What I'll build now (no form fields yet)

1. **`assessment_618_forms`** — one per assessment: link to the assessment and client, assigned nurse, status (`draft`, `signed`, `amended`), version number, link to the version it amends, amendment reason, the answers as a flexible data block (fields get defined later), timestamps for created/updated/last-autosaved/signed.
2. **`assessment_618_signatures`** — insert-only: signer name, account, role, signature image, attestation text, signed-at, IP address, device/browser, content snapshot and fingerprint.
3. **Database-level protections**
   - Row-level security on both, matching the other client tables: the assigned nurse sees and edits only her own forms; admins see all; nobody else sees anything.
   - A trigger that rejects any change to a form once its status is `signed` — the only allowed path forward is a new amendment row.
   - Signature rows: insert only; updates and deletes rejected outright.
   - A trigger that stamps the signature and flips the form to `signed` in one step, so a form can never appear signed without a matching signature record.
4. **Audit logging** — attach the existing audit function to both new tables so every insert, change and delete is written to the audit log with before/after values, same as your other client data.
5. **A minimal working screen** on the assessment: "Start 618 Assessment" / "Continue draft", an autosaving shell with a placeholder body, a Sign step with drawn signature and attestation, and a locked read-only view afterwards with an "Add correction" action.

Fields, PDF layout, and the client-file history list come in the next step once this foundation is approved.
