CREATE TABLE public.client_authorization_progress (
 client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
 assessment_source text CHECK (assessment_source IN ('pipeline','nurse')),
 assessment_id uuid,
 assessment_scheduled_at timestamptz,
 assessment_completed_on date,
 submitted_on date,
 approved_on date,
 denied_on date,
 denial_reason text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT authorization_one_decision CHECK (approved_on IS NULL OR denied_on IS NULL),
 CONSTRAINT authorization_denial_reason CHECK ((denied_on IS NULL AND denial_reason IS NULL) OR (denied_on IS NOT NULL AND nullif(btrim(denial_reason),'') IS NOT NULL AND length(denial_reason)<=2000)),
 CONSTRAINT authorization_decision_order CHECK (submitted_on IS NULL OR coalesce(approved_on,denied_on,submitted_on)>=submitted_on)
);
GRANT SELECT,INSERT,UPDATE ON public.client_authorization_progress TO authenticated;
GRANT ALL ON public.client_authorization_progress TO service_role;
ALTER TABLE public.client_authorization_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read authorization progress" ON public.client_authorization_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') AND public.is_operational_client(client_id));
CREATE POLICY "Admins insert authorization progress" ON public.client_authorization_progress FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND public.is_operational_client(client_id));
CREATE POLICY "Admins update authorization progress" ON public.client_authorization_progress FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') AND public.is_operational_client(client_id)) WITH CHECK (public.has_role(auth.uid(),'admin') AND public.is_operational_client(client_id));
CREATE TABLE public.client_authorization_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id),
 changed_at timestamptz NOT NULL DEFAULT now(),
 actor_id uuid,
 actor_name text NOT NULL,
 source text NOT NULL CHECK(source IN ('assessment','admin')),
 previous_values jsonb NOT NULL,
 new_values jsonb NOT NULL
);
GRANT SELECT ON public.client_authorization_history TO authenticated;
GRANT ALL ON public.client_authorization_history TO service_role;
ALTER TABLE public.client_authorization_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read authorization history" ON public.client_authorization_history FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') AND public.is_operational_client(client_id));
CREATE INDEX client_authorization_history_client_idx ON public.client_authorization_history(client_id,changed_at DESC);
CREATE INDEX client_authorization_waiting_idx ON public.client_authorization_progress(submitted_on) WHERE approved_on IS NULL AND denied_on IS NULL;
CREATE FUNCTION public.guard_authorization_history() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Authorization history is append-only.' USING ERRCODE='42501'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_authorization_history BEFORE INSERT OR UPDATE OR DELETE ON public.client_authorization_history FOR EACH ROW EXECUTE FUNCTION public.guard_authorization_history();
CREATE FUNCTION public.guard_authorization_progress() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE assessment_changed boolean; office_changed boolean; BEGIN
 IF TG_OP='INSERT' THEN
 assessment_changed:=NEW.assessment_source IS NOT NULL OR NEW.assessment_id IS NOT NULL OR NEW.assessment_scheduled_at IS NOT NULL OR NEW.assessment_completed_on IS NOT NULL;
 office_changed:=NEW.submitted_on IS NOT NULL OR NEW.approved_on IS NOT NULL OR NEW.denied_on IS NOT NULL OR NEW.denial_reason IS NOT NULL;
 ELSE
 IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN RAISE EXCEPTION 'Authorization client cannot be changed.' USING ERRCODE='42501'; END IF;
 assessment_changed:=ROW(NEW.assessment_source,NEW.assessment_id,NEW.assessment_scheduled_at,NEW.assessment_completed_on) IS DISTINCT FROM ROW(OLD.assessment_source,OLD.assessment_id,OLD.assessment_scheduled_at,OLD.assessment_completed_on);
 office_changed:=ROW(NEW.submitted_on,NEW.approved_on,NEW.denied_on,NEW.denial_reason) IS DISTINCT FROM ROW(OLD.submitted_on,OLD.approved_on,OLD.denied_on,OLD.denial_reason);
 END IF;
 IF assessment_changed AND pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Assessment progress is filled automatically.' USING ERRCODE='42501'; END IF;
 IF office_changed AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Only admins can change authorization progress.' USING ERRCODE='42501'; END IF;
 IF office_changed AND NOT public.is_operational_client(NEW.client_id) THEN RAISE EXCEPTION 'Test clients are excluded from authorization progress.' USING ERRCODE='42501'; END IF;
 NEW.updated_at:=now(); RETURN NEW; END $$;
CREATE TRIGGER guard_authorization_progress BEFORE INSERT OR UPDATE ON public.client_authorization_progress FOR EACH ROW EXECUTE FUNCTION public.guard_authorization_progress();
CREATE FUNCTION public.record_authorization_progress() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prior jsonb:='{}'; next_values jsonb; office_changed boolean; actor_label text; BEGIN
 IF TG_OP='UPDATE' THEN prior:=to_jsonb(OLD)-'updated_at'-'client_id'; END IF;
 next_values:=to_jsonb(NEW)-'updated_at'-'client_id';
 IF prior=next_values THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' AND NEW.assessment_id IS NULL AND NEW.submitted_on IS NULL AND NEW.approved_on IS NULL AND NEW.denied_on IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN office_changed:=NEW.submitted_on IS NOT NULL OR NEW.approved_on IS NOT NULL OR NEW.denied_on IS NOT NULL;
 ELSE office_changed:=ROW(NEW.submitted_on,NEW.approved_on,NEW.denied_on,NEW.denial_reason) IS DISTINCT FROM ROW(OLD.submitted_on,OLD.approved_on,OLD.denied_on,OLD.denial_reason); END IF;
 SELECT coalesce(nullif(btrim(raw_user_meta_data->>'full_name'),''),email,id::text) INTO actor_label FROM auth.users WHERE id=auth.uid();
 INSERT INTO public.client_authorization_history(client_id,actor_id,actor_name,source,previous_values,new_values) VALUES(NEW.client_id,auth.uid(),coalesce(actor_label,'System — assessment synchronization'),CASE WHEN office_changed THEN 'admin' ELSE 'assessment' END,prior,next_values);
 RETURN NEW; END $$;
CREATE TRIGGER record_authorization_progress AFTER INSERT OR UPDATE ON public.client_authorization_progress FOR EACH ROW EXECUTE FUNCTION public.record_authorization_progress();
CREATE FUNCTION public.sync_client_authorization_assessment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; a record; BEGIN
 IF TG_TABLE_NAME='clients' THEN cid:=NEW.id; ELSE IF TG_OP='DELETE' THEN cid:=OLD.client_id; ELSE cid:=NEW.client_id; END IF; END IF;
 IF NOT public.is_operational_client(cid) THEN RETURN NULL; END IF;
 SELECT * INTO a FROM (
 SELECT 'pipeline'::text source,p.id,p.created_at,p.updated_at,
 CASE WHEN lower(coalesce(p.status,''))='scheduled' THEN p.assessment_deadline ELSE NULL END scheduled_at,
 CASE WHEN lower(coalesce(p.status,''))='completed' THEN p.completed_date ELSE NULL END completed_on
 FROM public.client_assessments p WHERE p.client_id=cid
 UNION ALL
 SELECT 'nurse',n.id,n.created_at,n.updated_at,
 CASE WHEN n.scheduled_date IS NOT NULL AND n.scheduled_time IS NOT NULL THEN (n.scheduled_date+n.scheduled_time) AT TIME ZONE 'America/Chicago' ELSE NULL END,
 CASE WHEN lower(n.status)='completed' THEN (n.completed_at AT TIME ZONE 'America/Chicago')::date ELSE NULL END
 FROM public.nurse_assessments n WHERE n.client_id=cid AND n.assessment_type='618'
 ) candidates
 ORDER BY (scheduled_at IS NOT NULL OR completed_on IS NOT NULL) DESC,created_at DESC,updated_at DESC,id DESC LIMIT 1;
 INSERT INTO public.client_authorization_progress(client_id,assessment_source,assessment_id,assessment_scheduled_at,assessment_completed_on)
 VALUES(cid,a.source,a.id,a.scheduled_at,a.completed_on)
 ON CONFLICT(client_id) DO UPDATE SET assessment_source=EXCLUDED.assessment_source,assessment_id=EXCLUDED.assessment_id,assessment_scheduled_at=EXCLUDED.assessment_scheduled_at,assessment_completed_on=EXCLUDED.assessment_completed_on
 WHERE ROW(client_authorization_progress.assessment_source,client_authorization_progress.assessment_id,client_authorization_progress.assessment_scheduled_at,client_authorization_progress.assessment_completed_on) IS DISTINCT FROM ROW(EXCLUDED.assessment_source,EXCLUDED.assessment_id,EXCLUDED.assessment_scheduled_at,EXCLUDED.assessment_completed_on);
 IF TG_TABLE_NAME<>'clients' AND TG_OP='UPDATE' AND NEW.client_id IS DISTINCT FROM OLD.client_id THEN
 RAISE EXCEPTION 'Moving an assessment between clients is not supported by authorization synchronization.' USING ERRCODE='42501';
 END IF;
 RETURN NULL; END $$;
CREATE TRIGGER sync_authorization_pipeline AFTER INSERT OR UPDATE OR DELETE ON public.client_assessments FOR EACH ROW EXECUTE FUNCTION public.sync_client_authorization_assessment();
CREATE TRIGGER sync_authorization_nurse AFTER INSERT OR UPDATE OR DELETE ON public.nurse_assessments FOR EACH ROW EXECUTE FUNCTION public.sync_client_authorization_assessment();
CREATE TRIGGER sync_authorization_client AFTER INSERT OR UPDATE OF status ON public.clients FOR EACH ROW EXECUTE FUNCTION public.sync_client_authorization_assessment();
REVOKE ALL ON FUNCTION public.guard_authorization_history(),public.guard_authorization_progress(),public.record_authorization_progress(),public.sync_client_authorization_assessment() FROM PUBLIC,anon,authenticated;
INSERT INTO public.client_authorization_progress(client_id) SELECT id FROM public.clients WHERE status<>'test';
CREATE FUNCTION public.initialize_authorization_assessment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a record; BEGIN
 SELECT * INTO a FROM (
 SELECT 'pipeline'::text source,p.id,p.created_at,p.updated_at,CASE WHEN lower(coalesce(p.status,''))='scheduled' THEN p.assessment_deadline ELSE NULL END scheduled_at,CASE WHEN lower(coalesce(p.status,''))='completed' THEN p.completed_date ELSE NULL END completed_on FROM public.client_assessments p WHERE p.client_id=NEW.client_id
 UNION ALL
 SELECT 'nurse',n.id,n.created_at,n.updated_at,CASE WHEN n.scheduled_date IS NOT NULL AND n.scheduled_time IS NOT NULL THEN (n.scheduled_date+n.scheduled_time) AT TIME ZONE 'America/Chicago' ELSE NULL END,CASE WHEN lower(n.status)='completed' THEN (n.completed_at AT TIME ZONE 'America/Chicago')::date ELSE NULL END FROM public.nurse_assessments n WHERE n.client_id=NEW.client_id AND n.assessment_type='618'
 ) candidates ORDER BY (scheduled_at IS NOT NULL OR completed_on IS NOT NULL) DESC,created_at DESC,updated_at DESC,id DESC LIMIT 1;
 UPDATE public.client_authorization_progress SET assessment_source=a.source,assessment_id=a.id,assessment_scheduled_at=a.scheduled_at,assessment_completed_on=a.completed_on WHERE client_id=NEW.client_id;
 RETURN NULL; END $$;
CREATE TRIGGER initialize_authorization_assessment AFTER UPDATE OF updated_at ON public.client_authorization_progress FOR EACH ROW WHEN (OLD.assessment_id IS NULL AND NEW.assessment_id IS NULL) EXECUTE FUNCTION public.initialize_authorization_assessment();
UPDATE public.client_authorization_progress SET updated_at=updated_at;
DROP TRIGGER initialize_authorization_assessment ON public.client_authorization_progress;
DROP FUNCTION public.initialize_authorization_assessment();