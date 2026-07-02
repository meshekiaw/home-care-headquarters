-- Mark all backfilled historical assessments as completed so they don't trigger false alerts.
-- These records were auto-created for pre-existing clients already in care and share the July 4 deadline.
UPDATE public.client_assessments
SET status = 'completed',
    updated_at = now()
WHERE status <> 'completed'
  AND due_date::date = DATE '2026-07-04';