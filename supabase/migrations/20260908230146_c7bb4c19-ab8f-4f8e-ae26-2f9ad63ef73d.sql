CREATE OR REPLACE FUNCTION public.cleanup_notifications_on_record_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications WHERE related_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_notifications_on_client_delete ON public.clients;
CREATE TRIGGER cleanup_notifications_on_client_delete
  BEFORE DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_on_record_delete();

DROP TRIGGER IF EXISTS cleanup_notifications_on_caregiver_delete ON public.caregivers;
CREATE TRIGGER cleanup_notifications_on_caregiver_delete
  BEFORE DELETE ON public.caregivers
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_on_record_delete();

DROP TRIGGER IF EXISTS cleanup_notifications_on_nurse_delete ON public.nurses;
CREATE TRIGGER cleanup_notifications_on_nurse_delete
  BEFORE DELETE ON public.nurses
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_on_record_delete();

DROP TRIGGER IF EXISTS cleanup_notifications_on_assessment_delete ON public.client_assessments;
CREATE TRIGGER cleanup_notifications_on_assessment_delete
  BEFORE DELETE ON public.client_assessments
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_on_record_delete();