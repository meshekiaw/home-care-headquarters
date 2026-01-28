-- Create caregiver_credentials table for tracking certifications/licenses
CREATE TABLE public.caregiver_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  credential_type TEXT NOT NULL, -- 'license', 'certification', 'background_check', 'training'
  credential_name TEXT NOT NULL,
  issuing_organization TEXT,
  credential_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'pending', 'revoked'
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create caregiver_availability table for weekly schedules
CREATE TABLE public.caregiver_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (caregiver_id, day_of_week, start_time)
);

-- Create caregiver_skills table for skill matching
CREATE TABLE public.caregiver_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT NOT NULL DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
  years_experience INTEGER,
  is_certified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (caregiver_id, skill_name)
);

-- Enable RLS on all tables
ALTER TABLE public.caregiver_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for caregiver_credentials
CREATE POLICY "Users can view their own caregiver credentials" ON public.caregiver_credentials
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own caregiver credentials" ON public.caregiver_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own caregiver credentials" ON public.caregiver_credentials
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own caregiver credentials" ON public.caregiver_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for caregiver_availability
CREATE POLICY "Users can view their own caregiver availability" ON public.caregiver_availability
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own caregiver availability" ON public.caregiver_availability
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own caregiver availability" ON public.caregiver_availability
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own caregiver availability" ON public.caregiver_availability
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for caregiver_skills
CREATE POLICY "Users can view their own caregiver skills" ON public.caregiver_skills
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own caregiver skills" ON public.caregiver_skills
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own caregiver skills" ON public.caregiver_skills
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own caregiver skills" ON public.caregiver_skills
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_caregiver_credentials_caregiver_id ON public.caregiver_credentials(caregiver_id);
CREATE INDEX idx_caregiver_credentials_expiry ON public.caregiver_credentials(expiry_date);
CREATE INDEX idx_caregiver_availability_caregiver_id ON public.caregiver_availability(caregiver_id);
CREATE INDEX idx_caregiver_skills_caregiver_id ON public.caregiver_skills(caregiver_id);
CREATE INDEX idx_caregiver_skills_skill_name ON public.caregiver_skills(skill_name);

-- Add update trigger for credentials
CREATE TRIGGER update_caregiver_credentials_updated_at
  BEFORE UPDATE ON public.caregiver_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();