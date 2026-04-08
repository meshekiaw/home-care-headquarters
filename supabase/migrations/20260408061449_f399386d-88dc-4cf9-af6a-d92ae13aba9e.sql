
-- Table to store recurring calendar assignment configurations
CREATE TABLE public.monthly_calendar_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE CASCADE NOT NULL,
  is_archoices BOOLEAN NOT NULL DEFAULT false,
  personal_care_hours NUMERIC NOT NULL DEFAULT 64,
  attendant_care_hours NUMERIC NOT NULL DEFAULT 4,
  standard_hours NUMERIC NOT NULL DEFAULT 64,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_calendar_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar assignments"
  ON public.monthly_calendar_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own calendar assignments"
  ON public.monthly_calendar_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own calendar assignments"
  ON public.monthly_calendar_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own calendar assignments"
  ON public.monthly_calendar_assignments FOR DELETE USING (auth.uid() = user_id);

-- Table to store generated monthly calendars
CREATE TABLE public.monthly_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assignment_id UUID REFERENCES public.monthly_calendar_assignments(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  schedule_data JSONB NOT NULL DEFAULT '{}',
  total_hours NUMERIC NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, month, year)
);

ALTER TABLE public.monthly_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly calendars"
  ON public.monthly_calendars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own monthly calendars"
  ON public.monthly_calendars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own monthly calendars"
  ON public.monthly_calendars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own monthly calendars"
  ON public.monthly_calendars FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger to assignments
CREATE TRIGGER update_monthly_calendar_assignments_updated_at
  BEFORE UPDATE ON public.monthly_calendar_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
