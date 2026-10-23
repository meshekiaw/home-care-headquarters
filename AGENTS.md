# Architecture rules

- Keep caregiver onboarding independent of applications, policy acknowledgments, orientation and scheduling; read existing orientation completion without changing its lifecycle.
- Route all caregiver-document file operations through the authenticated caregiver-documents Edge Function; deny direct Storage access so every read rechecks roles and ownership and admin reads cannot bypass the view log.
- Use single-use, user-bound, 60-second document access tickets rather than transferable Storage signed URLs; never return storage URLs or paths as public links.
- Keep onboarding history and document view logs append-only, retain records with history, and keep office notes admin-only.
- Preserve deprecated maltreatment date columns and synchronize them with the corrected check-date columns; generated expiration columns are the authoritative warning dates and cannot be manually written.
- Initialize caregiver onboarding atomically on caregiver creation, with existing caregivers exempt; onboarding must not change cleared-to-schedule enforcement.