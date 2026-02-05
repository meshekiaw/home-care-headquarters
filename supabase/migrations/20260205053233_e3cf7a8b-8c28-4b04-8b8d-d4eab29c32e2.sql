-- Create client_nurses table for linking nurses to clients
CREATE TABLE public.client_nurses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nurse_id UUID NOT NULL REFERENCES public.nurses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'primary',
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, nurse_id, user_id)
);

-- Create client_assessments table for tracking assessments with expiry
CREATE TABLE public.client_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_nurse_id UUID REFERENCES public.nurses(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  assessment_type TEXT NOT NULL,
  assessment_name TEXT NOT NULL,
  due_date DATE NOT NULL,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_handoffs table for nurses to release clients for reassignment
CREATE TABLE public.assessment_handoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.client_assessments(id) ON DELETE CASCADE,
  released_by_nurse_id UUID NOT NULL REFERENCES public.nurses(id) ON DELETE CASCADE,
  picked_up_by_nurse_id UUID REFERENCES public.nurses(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  reason TEXT,
  released_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  picked_up_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.client_nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_handoffs ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_nurses
CREATE POLICY "Users can view their own client nurses" ON public.client_nurses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own client nurses" ON public.client_nurses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own client nurses" ON public.client_nurses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own client nurses" ON public.client_nurses FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for client_assessments
CREATE POLICY "Users can view their own client assessments" ON public.client_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own client assessments" ON public.client_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own client assessments" ON public.client_assessments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own client assessments" ON public.client_assessments FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for assessment_handoffs
CREATE POLICY "Users can view their own assessment handoffs" ON public.assessment_handoffs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own assessment handoffs" ON public.assessment_handoffs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assessment handoffs" ON public.assessment_handoffs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assessment handoffs" ON public.assessment_handoffs FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on client_assessments
CREATE TRIGGER update_client_assessments_updated_at
  BEFORE UPDATE ON public.client_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();