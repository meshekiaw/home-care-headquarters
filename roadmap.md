# Roadmap

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
- [ ] Next: Nurse Visit form fields (awaiting form)
- [ ] Next: the actual 618 form fields
- [ ] Next: PDF export and a 618 history list on the client record
