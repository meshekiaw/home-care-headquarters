
-- Deduplicate: keep the row with best progress/status
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY caregiver_id, course_id
      ORDER BY
        CASE status WHEN 'completed' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        progress_percentage DESC NULLS LAST,
        created_at ASC
    ) AS rn
  FROM public.lms_assignments
)
DELETE FROM public.lms_assignments a
USING ranked r
WHERE a.id = r.id AND r.rn > 1;

-- Prevent future duplicates
ALTER TABLE public.lms_assignments
  ADD CONSTRAINT lms_assignments_caregiver_course_unique
  UNIQUE (caregiver_id, course_id);
