
-- 1. Remove seeded placeholder courses (cascades to seeded test assignments)
DELETE FROM public.lms_courses;

-- 2. Seed lms_courses from existing orientation_modules (id-matched)
INSERT INTO public.lms_courses (
  id, user_id, title, description, content_type, content_body,
  duration_minutes, is_required, category, passing_score, is_active
)
SELECT
  om.id,
  om.user_id,
  om.title,
  'Orientation Section ' || om.section_number,
  'orientation',
  om.content,
  15,
  true,
  'Orientation',
  80,
  true
FROM public.orientation_modules om;

-- 3. Sync function: keep lms_courses in lockstep with orientation_modules
CREATE OR REPLACE FUNCTION public.sync_orientation_to_lms_course()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lms_courses (
      id, user_id, title, description, content_type, content_body,
      duration_minutes, is_required, category, passing_score, is_active
    ) VALUES (
      NEW.id, NEW.user_id, NEW.title,
      'Orientation Section ' || NEW.section_number,
      'orientation', NEW.content, 15, true, 'Orientation', 80, true
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      content_body = EXCLUDED.content_body,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.lms_courses
    SET title = NEW.title,
        description = 'Orientation Section ' || NEW.section_number,
        content_body = NEW.content,
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.lms_courses WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_orientation_to_lms_course_trg ON public.orientation_modules;
CREATE TRIGGER sync_orientation_to_lms_course_trg
AFTER INSERT OR UPDATE OR DELETE ON public.orientation_modules
FOR EACH ROW EXECUTE FUNCTION public.sync_orientation_to_lms_course();
