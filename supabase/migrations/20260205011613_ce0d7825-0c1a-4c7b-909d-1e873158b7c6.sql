-- Create state_regulations table for storing state rules and regulations
CREATE TABLE public.state_regulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  state TEXT NOT NULL,
  regulation_name TEXT NOT NULL,
  regulation_description TEXT,
  regulation_code TEXT,
  category TEXT DEFAULT 'general',
  source_url TEXT,
  effective_date DATE,
  is_predefined BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated_policies table for AI-generated policies and procedures
CREATE TABLE public.generated_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  regulation_id UUID NOT NULL REFERENCES public.state_regulations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on state_regulations
ALTER TABLE public.state_regulations ENABLE ROW LEVEL SECURITY;

-- RLS policies for state_regulations
CREATE POLICY "Users can view their own regulations" 
ON public.state_regulations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own regulations" 
ON public.state_regulations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own regulations" 
ON public.state_regulations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own regulations" 
ON public.state_regulations FOR DELETE 
USING (auth.uid() = user_id);

-- Enable RLS on generated_policies
ALTER TABLE public.generated_policies ENABLE ROW LEVEL SECURITY;

-- RLS policies for generated_policies
CREATE POLICY "Users can view their own policies" 
ON public.generated_policies FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own policies" 
ON public.generated_policies FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own policies" 
ON public.generated_policies FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own policies" 
ON public.generated_policies FOR DELETE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_state_regulations_updated_at
BEFORE UPDATE ON public.state_regulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generated_policies_updated_at
BEFORE UPDATE ON public.generated_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();