
CREATE TABLE public.call_off_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid REFERENCES public.caregivers(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  caregiver_name text,
  client_name text,
  reason text NOT NULL,
  shift_start timestamptz NOT NULL,
  shift_end timestamptz,
  service_type text,
  payer text,
  urgency text NOT NULL DEFAULT 'medium',
  notes text,
  ai_response jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_off_events TO authenticated;
GRANT ALL ON public.call_off_events TO service_role;
ALTER TABLE public.call_off_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access call_off_events" ON public.call_off_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users manage own call_off_events" ON public.call_off_events FOR ALL TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE TRIGGER update_call_off_events_updated_at BEFORE UPDATE ON public.call_off_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.evv_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  exception_type text NOT NULL,
  ai_note jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evv_corrections TO authenticated;
GRANT ALL ON public.evv_corrections TO service_role;
ALTER TABLE public.evv_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access evv_corrections" ON public.evv_corrections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users manage own evv_corrections" ON public.evv_corrections FOR ALL TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
