ALTER TABLE public.client_assessments ADD COLUMN scheduled_at timestamptz;
COMMENT ON COLUMN public.client_assessments.scheduled_at IS 'Actual scheduled assessment appointment date/time, separate from assessment_deadline and due_date. Null when no appointment time has been recorded; never infer from a deadline.';
CREATE OR REPLACE FUNCTION public.refresh_client_authorization_assessment(cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a record; BEGIN
 IF NOT public.is_operational_client(cid) THEN RETURN; END IF;
 SELECT * INTO a FROM (
 SELECT 'pipeline'::text source,p.id,p.created_at,p.updated_at,p.scheduled_at,CASE WHEN lower(coalesce(p.status,''))='completed' THEN p.completed_date ELSE NULL END completed_on FROM public.client_assessments p WHERE p.client_id=cid
 UNION ALL
 SELECT 'nurse',n.id,n.created_at,n.updated_at,CASE WHEN n.scheduled_date IS NOT NULL AND n.scheduled_time IS NOT NULL THEN (n.scheduled_date+n.scheduled_time) AT TIME ZONE 'America/Chicago' ELSE NULL END,CASE WHEN lower(n.status)='completed' THEN (n.completed_at AT TIME ZONE 'America/Chicago')::date ELSE NULL END FROM public.nurse_assessments n WHERE n.client_id=cid AND n.assessment_type='618'
 ) candidates ORDER BY (scheduled_at IS NOT NULL OR completed_on IS NOT NULL) DESC,created_at DESC,updated_at DESC,id DESC LIMIT 1;
 INSERT INTO public.client_authorization_progress(client_id,assessment_source,assessment_id,assessment_scheduled_at,assessment_completed_on) VALUES(cid,a.source,a.id,a.scheduled_at,a.completed_on)
 ON CONFLICT(client_id) DO UPDATE SET assessment_source=EXCLUDED.assessment_source,assessment_id=EXCLUDED.assessment_id,assessment_scheduled_at=EXCLUDED.assessment_scheduled_at,assessment_completed_on=EXCLUDED.assessment_completed_on
 WHERE ROW(client_authorization_progress.assessment_source,client_authorization_progress.assessment_id,client_authorization_progress.assessment_scheduled_at,client_authorization_progress.assessment_completed_on) IS DISTINCT FROM ROW(EXCLUDED.assessment_source,EXCLUDED.assessment_id,EXCLUDED.assessment_scheduled_at,EXCLUDED.assessment_completed_on);
 END $$;