-- Create table for client care requirements/required skills
CREATE TABLE public.client_required_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'required', -- 'required', 'preferred', 'nice_to_have'
  minimum_proficiency TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
  requires_certification BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_required_skills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own client required skills"
  ON public.client_required_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own client required skills"
  ON public.client_required_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client required skills"
  ON public.client_required_skills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client required skills"
  ON public.client_required_skills FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_client_required_skills_client_id ON public.client_required_skills(client_id);
CREATE INDEX idx_client_required_skills_skill_name ON public.client_required_skills(skill_name);