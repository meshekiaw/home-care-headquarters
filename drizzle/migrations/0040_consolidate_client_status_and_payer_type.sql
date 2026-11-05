ALTER TABLE public.clients ADD COLUMN payer_type_other text;
ALTER TABLE public.clients DROP CONSTRAINT clients_payer_type_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_payer_type_check CHECK (payer_type IN ('Medicaid','ARChoices','PASSE','VA','Private pay','Long-term care insurance','Other'));
ALTER TABLE public.clients ALTER COLUMN status SET DEFAULT 'not_set';
ALTER TABLE public.clients DISABLE TRIGGER validate_client_planning_fields;
CREATE OR REPLACE FUNCTION public.record_client_status_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor_label text; BEGIN
 IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
 INSERT INTO public.client_status_history(client_id,previous_status,new_status,effective_date,expected_return_date,reason,actor_id,actor_name) VALUES(NEW.id,OLD.status,NEW.status,coalesce(NEW.client_status_date,current_date),NEW.expected_return_date,NEW.client_status_reason,'00000000-0000-0000-0000-000000000000','System — authorized status consolidation');
 END IF; RETURN NEW; END; $$;
UPDATE public.clients SET status=CASE WHEN client_status <> 'not_set' THEN client_status WHEN lower(status)='pending' THEN 'new_client' WHEN lower(status)='active' THEN 'not_set' ELSE 'discharged' END;
CREATE OR REPLACE FUNCTION public.validate_client_planning_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE changed boolean; entry record; BEGIN
 IF TG_OP='INSERT' THEN changed:=true;
 ELSE changed:=ROW(NEW.payer_type,NEW.payer_type_other,NEW.requested_schedule,NEW.requested_schedule_notes,NEW.status,NEW.client_status_date,NEW.expected_return_date,NEW.client_status_reason) IS DISTINCT FROM ROW(OLD.payer_type,OLD.payer_type_other,OLD.requested_schedule,OLD.requested_schedule_notes,OLD.status,OLD.client_status_date,OLD.expected_return_date,OLD.client_status_reason); END IF;
 IF NOT changed THEN RETURN NEW; END IF;
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can change client payer type, requested schedule or status.' USING ERRCODE='42501'; END IF;
 IF NEW.payer_type='Other' AND nullif(btrim(NEW.payer_type_other),'') IS NULL THEN RAISE EXCEPTION 'Enter the other payer.'; END IF;
 IF length(coalesce(NEW.payer_type_other,''))>200 OR length(coalesce(NEW.requested_schedule_notes,''))>2000 OR length(coalesce(NEW.client_status_reason,''))>2000 THEN RAISE EXCEPTION 'Client planning text is too long.'; END IF;
 IF NEW.status IS NULL OR NEW.status NOT IN ('not_set','new_client','current_staffed','current_needs_staffing','hospitalized','on_hold','discharged','test') THEN RAISE EXCEPTION 'Select a valid client status.'; END IF;
 IF NEW.status IN ('hospitalized','on_hold','discharged') AND NEW.client_status_date IS NULL THEN RAISE EXCEPTION 'Enter the status date.'; END IF;
 IF NEW.status IN ('on_hold','discharged') AND nullif(btrim(NEW.client_status_reason),'') IS NULL THEN RAISE EXCEPTION 'Enter a reason for this client status.'; END IF;
 IF NEW.expected_return_date IS NOT NULL AND (NEW.status <> 'hospitalized' OR NEW.expected_return_date < NEW.client_status_date) THEN RAISE EXCEPTION 'Expected return must be on or after the admit date.'; END IF;
 IF NEW.requested_schedule IS NULL OR jsonb_typeof(NEW.requested_schedule)<>'object' THEN RAISE EXCEPTION 'Enter a valid requested schedule.'; END IF;
 FOR entry IN SELECT key,value FROM jsonb_each(NEW.requested_schedule) LOOP
 IF entry.key NOT IN ('mon','tue','wed','thu','fri','sat','sun') OR jsonb_typeof(entry.value)<>'object' OR jsonb_typeof(entry.value->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Enter a valid requested schedule day.'; END IF;
 IF entry.value->>'enabled'='true' AND (jsonb_typeof(entry.value->'start') IS DISTINCT FROM 'string' OR jsonb_typeof(entry.value->'end') IS DISTINCT FROM 'string' OR entry.value->>'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR entry.value->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR entry.value->>'start'=entry.value->>'end') THEN RAISE EXCEPTION 'Each requested day needs different start and end times.'; END IF;
 END LOOP; RETURN NEW; END; $$;
ALTER TABLE public.clients ENABLE TRIGGER validate_client_planning_fields;
CREATE OR REPLACE FUNCTION public.record_client_status_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prior text:='not_set'; actor_label text; BEGIN
 IF TG_OP='UPDATE' THEN prior:=OLD.status; IF ROW(NEW.status,NEW.client_status_date,NEW.expected_return_date,NEW.client_status_reason) IS NOT DISTINCT FROM ROW(OLD.status,OLD.client_status_date,OLD.expected_return_date,OLD.client_status_reason) THEN RETURN NEW; END IF;
 ELSIF NEW.status='not_set' THEN RETURN NEW; END IF;
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can record client status changes.' USING ERRCODE='42501'; END IF;
 SELECT coalesce(nullif(btrim(raw_user_meta_data->>'full_name'),''),email,id::text) INTO actor_label FROM auth.users WHERE id=auth.uid();
 INSERT INTO public.client_status_history(client_id,previous_status,new_status,effective_date,expected_return_date,reason,actor_id,actor_name) VALUES(NEW.id,prior,NEW.status,coalesce(NEW.client_status_date,current_date),NEW.expected_return_date,NEW.client_status_reason,auth.uid(),coalesce(actor_label,auth.uid()::text)); RETURN NEW; END; $$;
CREATE INDEX clients_status_idx ON public.clients(status);
COMMENT ON COLUMN public.clients.status IS 'Authoritative office client status. Active: current_staffed, current_needs_staffing, hospitalized, on_hold, not_set. Test excluded from operational views.';
COMMENT ON COLUMN public.clients.client_status IS 'DEPRECATED: consolidated into status; retained only for live-version compatibility. Never read or write in new app code.';
COMMENT ON COLUMN public.clients.payers IS 'DEPRECATED: duplicate payer field retired; data removed separately. Use payer_type only.';
COMMENT ON COLUMN public.clients.payer_other IS 'DEPRECATED: duplicate payer description retired; data removed separately. Use payer_type_other only.';
CREATE FUNCTION public.is_operational_client(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p_id IS NULL OR EXISTS(SELECT 1 FROM public.clients WHERE id=p_id AND status<>'test') $$;
REVOKE ALL ON FUNCTION public.is_operational_client(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_operational_client(uuid) TO authenticated,service_role;
CREATE POLICY "Exclude Test client operations" ON public.appointments AS RESTRICTIVE FOR ALL TO authenticated USING(public.is_operational_client(client_id)) WITH CHECK(public.is_operational_client(client_id));
CREATE POLICY "Exclude Test client operations" ON public.client_assessments AS RESTRICTIVE FOR ALL TO authenticated USING(public.is_operational_client(client_id)) WITH CHECK(public.is_operational_client(client_id));
CREATE POLICY "Exclude Test client operations" ON public.nurse_assessments AS RESTRICTIVE FOR ALL TO authenticated USING(public.is_operational_client(client_id)) WITH CHECK(public.is_operational_client(client_id));
CREATE POLICY "Exclude Test client operations" ON public.client_nurses AS RESTRICTIVE FOR ALL TO authenticated USING(public.is_operational_client(client_id)) WITH CHECK(public.is_operational_client(client_id));
CREATE POLICY "Exclude Test client operations" ON public.client_caregivers AS RESTRICTIVE FOR ALL TO authenticated USING(public.is_operational_client(client_id)) WITH CHECK(public.is_operational_client(client_id));
CREATE POLICY "Exclude Test client operations" ON public.monthly_calendar_assignments AS RESTRICTIVE FOR ALL TO authenticated USING(public.is_operational_client(client_id)) WITH CHECK(public.is_operational_client(client_id));
CREATE POLICY "Exclude Test client operations" ON public.call_off_events AS RESTRICTIVE FOR ALL TO authenticated USING(public.is_operational_client(client_id)) WITH CHECK(public.is_operational_client(client_id));
CREATE FUNCTION public.client_record_is_test(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.clients c WHERE c.status='test' AND (c.id=p_id OR EXISTS(SELECT 1 FROM public.appointments a WHERE a.id=p_id AND a.client_id=c.id) OR EXISTS(SELECT 1 FROM public.client_assessments a WHERE a.id=p_id AND a.client_id=c.id) OR EXISTS(SELECT 1 FROM public.nurse_assessments a WHERE a.id=p_id AND a.client_id=c.id) OR EXISTS(SELECT 1 FROM public.assessment_handoffs h JOIN public.client_assessments a ON a.id=h.assessment_id WHERE h.id=p_id AND a.client_id=c.id) OR EXISTS(SELECT 1 FROM public.monthly_calendar_assignments a WHERE a.id=p_id AND a.client_id=c.id) OR EXISTS(SELECT 1 FROM public.monthly_calendars m JOIN public.monthly_calendar_assignments a ON a.id=m.assignment_id WHERE m.id=p_id AND a.client_id=c.id))) $$;
REVOKE ALL ON FUNCTION public.client_record_is_test(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.client_record_is_test(uuid) TO authenticated,service_role;
CREATE POLICY "Exclude Test calendars" ON public.monthly_calendars AS RESTRICTIVE FOR ALL TO authenticated USING(NOT public.client_record_is_test(assignment_id)) WITH CHECK(NOT public.client_record_is_test(assignment_id));
CREATE POLICY "Exclude Test handoffs" ON public.assessment_handoffs AS RESTRICTIVE FOR ALL TO authenticated USING(NOT public.client_record_is_test(assessment_id)) WITH CHECK(NOT public.client_record_is_test(assessment_id));
CREATE POLICY "Exclude Test notifications" ON public.notifications AS RESTRICTIVE FOR SELECT TO authenticated USING(NOT public.client_record_is_test(related_id));
CREATE FUNCTION public.guard_test_client_scheduling() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.is_operational_client(NEW.client_id) THEN RAISE EXCEPTION 'Test clients are excluded from scheduling and assessment queues.' USING ERRCODE='42501'; END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.guard_test_client_scheduling() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_test_client_scheduling BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.guard_test_client_scheduling();
CREATE TRIGGER guard_test_client_scheduling BEFORE INSERT OR UPDATE ON public.monthly_calendar_assignments FOR EACH ROW EXECUTE FUNCTION public.guard_test_client_scheduling();
CREATE TRIGGER guard_test_client_scheduling BEFORE INSERT OR UPDATE ON public.nurse_assessments FOR EACH ROW EXECUTE FUNCTION public.guard_test_client_scheduling();
CREATE TRIGGER guard_test_client_scheduling BEFORE INSERT OR UPDATE ON public.client_assessments FOR EACH ROW EXECUTE FUNCTION public.guard_test_client_scheduling();