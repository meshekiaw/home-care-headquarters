ALTER TABLE public.clients
  ADD COLUMN payers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN payer_other text,
  ADD COLUMN requested_schedule jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN requested_schedule_notes text,
  ADD COLUMN client_status text NOT NULL DEFAULT 'not_set',
  ADD COLUMN client_status_date date,
  ADD COLUMN expected_return_date date,
  ADD COLUMN client_status_reason text;

CREATE TABLE public.client_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  effective_date date NOT NULL,
  expected_return_date date,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  actor_name text NOT NULL
);
GRANT SELECT ON public.client_status_history TO authenticated;
GRANT ALL ON public.client_status_history TO service_role;
ALTER TABLE public.client_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read client status history" ON public.client_status_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX client_status_history_client_time_idx ON public.client_status_history(client_id, changed_at DESC, id);
CREATE INDEX clients_operational_status_idx ON public.clients(client_status);
CREATE INDEX clients_payers_idx ON public.clients USING gin(payers);

CREATE OR REPLACE FUNCTION public.validate_client_planning_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE changed boolean; entry record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    changed := cardinality(NEW.payers) > 0 OR NEW.payer_other IS NOT NULL OR NEW.requested_schedule <> '{}'::jsonb OR NEW.requested_schedule_notes IS NOT NULL OR NEW.client_status <> 'not_set' OR NEW.client_status_date IS NOT NULL OR NEW.expected_return_date IS NOT NULL OR NEW.client_status_reason IS NOT NULL;
  ELSE
    changed := ROW(NEW.payers, NEW.payer_other, NEW.requested_schedule, NEW.requested_schedule_notes, NEW.client_status, NEW.client_status_date, NEW.expected_return_date, NEW.client_status_reason) IS DISTINCT FROM ROW(OLD.payers, OLD.payer_other, OLD.requested_schedule, OLD.requested_schedule_notes, OLD.client_status, OLD.client_status_date, OLD.expected_return_date, OLD.client_status_reason);
  END IF;
  IF NOT changed THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change client payer, requested schedule or client status.' USING ERRCODE = '42501';
  END IF;
  IF NEW.payers IS NULL OR NOT NEW.payers <@ ARRAY['Medicaid personal care','ARChoices','VA','Private pay','Other']::text[] OR array_position(NEW.payers, NULL) IS NOT NULL OR cardinality(NEW.payers) <> (SELECT count(DISTINCT p) FROM unnest(NEW.payers) p) THEN
    RAISE EXCEPTION 'Select valid, distinct payers.';
  END IF;
  IF 'Other' = ANY(NEW.payers) AND nullif(btrim(NEW.payer_other), '') IS NULL THEN
    RAISE EXCEPTION 'Enter the other payer.';
  END IF;
  IF length(coalesce(NEW.payer_other,'')) > 200 OR length(coalesce(NEW.requested_schedule_notes,'')) > 2000 OR length(coalesce(NEW.client_status_reason,'')) > 2000 THEN RAISE EXCEPTION 'Client planning text is too long.'; END IF;
  IF NEW.client_status IS NULL OR NEW.client_status NOT IN ('not_set','new_client','current_staffed','current_needs_staffing','hospitalized','on_hold','discharged') THEN RAISE EXCEPTION 'Select a valid client status.'; END IF;
  IF NEW.client_status IN ('hospitalized','on_hold','discharged') AND NEW.client_status_date IS NULL THEN RAISE EXCEPTION 'Enter the status date.'; END IF;
  IF NEW.client_status IN ('on_hold','discharged') AND nullif(btrim(NEW.client_status_reason),'') IS NULL THEN RAISE EXCEPTION 'Enter a reason for this client status.'; END IF;
  IF NEW.expected_return_date IS NOT NULL AND (NEW.client_status <> 'hospitalized' OR NEW.expected_return_date < NEW.client_status_date) THEN RAISE EXCEPTION 'Expected return must be on or after the admit date.'; END IF;
  IF NEW.requested_schedule IS NULL OR jsonb_typeof(NEW.requested_schedule) <> 'object' THEN RAISE EXCEPTION 'Enter a valid requested schedule.'; END IF;
  FOR entry IN SELECT key, value FROM jsonb_each(NEW.requested_schedule) LOOP
    IF entry.key NOT IN ('mon','tue','wed','thu','fri','sat','sun') OR jsonb_typeof(entry.value) <> 'object' OR jsonb_typeof(entry.value->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Enter a valid requested schedule day.'; END IF;
    IF entry.value->>'enabled' = 'true' THEN
      IF jsonb_typeof(entry.value->'start') IS DISTINCT FROM 'string' OR jsonb_typeof(entry.value->'end') IS DISTINCT FROM 'string' OR entry.value->>'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR entry.value->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR entry.value->>'start' = entry.value->>'end' THEN RAISE EXCEPTION 'Each requested day needs different start and end times.'; END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_client_planning_fields BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.validate_client_planning_fields();

CREATE OR REPLACE FUNCTION public.record_client_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prior text := 'not_set'; actor_label text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    prior := OLD.client_status;
    IF ROW(NEW.client_status,NEW.client_status_date,NEW.expected_return_date,NEW.client_status_reason) IS NOT DISTINCT FROM ROW(OLD.client_status,OLD.client_status_date,OLD.expected_return_date,OLD.client_status_reason) THEN RETURN NEW; END IF;
  ELSIF NEW.client_status = 'not_set' THEN RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can record client status changes.' USING ERRCODE='42501'; END IF;
  SELECT coalesce(nullif(btrim(raw_user_meta_data->>'full_name'),''),email,id::text) INTO actor_label FROM auth.users WHERE id=auth.uid();
  INSERT INTO public.client_status_history(client_id,previous_status,new_status,effective_date,expected_return_date,reason,actor_id,actor_name)
  VALUES(NEW.id,prior,NEW.client_status,coalesce(NEW.client_status_date,current_date),NEW.expected_return_date,NEW.client_status_reason,auth.uid(),coalesce(actor_label,auth.uid()::text));
  RETURN NEW;
END;
$$;
CREATE TRIGGER record_client_status_change AFTER INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.record_client_status_change();

CREATE OR REPLACE FUNCTION public.guard_client_status_history()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP <> 'INSERT' OR pg_trigger_depth() < 2 THEN RAISE EXCEPTION 'Client status history is append-only and recorded by client changes.' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_client_status_history BEFORE INSERT OR UPDATE OR DELETE ON public.client_status_history FOR EACH ROW EXECUTE FUNCTION public.guard_client_status_history();
REVOKE ALL ON FUNCTION public.validate_client_planning_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_client_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_client_status_history() FROM PUBLIC, anon, authenticated;
COMMENT ON COLUMN public.clients.payers IS 'Operational multi-payer selections. Empty means Not set. Independent of legacy payer_type assessment rules.';
COMMENT ON COLUMN public.clients.client_status IS 'Office client status. Independent of legacy status and assessment lifecycle.';
COMMENT ON COLUMN public.clients.requested_schedule IS 'Requested weekly times only; overnight end before start means next day. Never changes authorization, appointments or assessment dates.';