
-- Trigger: sync orientation_progress.completed_at into lms_assignments for the caregiver's orientation courses
CREATE OR REPLACE FUNCTION public.sync_orientation_completion_to_lms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    UPDATE public.lms_assignments a
    SET status = 'completed',
        completed_at = NEW.completed_at,
        progress_percentage = 100,
        score = COALESCE(a.score, 100),
        updated_at = now()
    FROM public.lms_courses c
    WHERE a.course_id = c.id
      AND c.content_type = 'orientation'
      AND a.caregiver_id = NEW.caregiver_id
      AND a.status <> 'completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_orientation_completion_to_lms ON public.orientation_progress;
CREATE TRIGGER trg_sync_orientation_completion_to_lms
AFTER INSERT OR UPDATE OF completed_at ON public.orientation_progress
FOR EACH ROW EXECUTE FUNCTION public.sync_orientation_completion_to_lms();
