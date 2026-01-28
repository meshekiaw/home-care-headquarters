-- Create care_plans table
CREATE TABLE public.care_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    goals TEXT,
    frequency TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medical_history table
CREATE TABLE public.medical_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    condition_name TEXT NOT NULL,
    diagnosis_date DATE,
    notes TEXT,
    severity TEXT DEFAULT 'moderate',
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create caregivers table
CREATE TABLE public.caregivers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specializations TEXT[],
    status TEXT NOT NULL DEFAULT 'active',
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_caregivers junction table for assignments
CREATE TABLE public.client_caregivers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    role TEXT DEFAULT 'primary',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(client_id, caregiver_id)
);

-- Create client_documents table
CREATE TABLE public.client_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    category TEXT DEFAULT 'general',
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for care_plans
CREATE POLICY "Users can view their own care plans" ON public.care_plans
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own care plans" ON public.care_plans
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own care plans" ON public.care_plans
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own care plans" ON public.care_plans
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for medical_history
CREATE POLICY "Users can view their own medical history" ON public.medical_history
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own medical history" ON public.medical_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical history" ON public.medical_history
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medical history" ON public.medical_history
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for caregivers
CREATE POLICY "Users can view their own caregivers" ON public.caregivers
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own caregivers" ON public.caregivers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own caregivers" ON public.caregivers
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own caregivers" ON public.caregivers
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for client_caregivers
CREATE POLICY "Users can view their own client caregivers" ON public.client_caregivers
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own client caregivers" ON public.client_caregivers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client caregivers" ON public.client_caregivers
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client caregivers" ON public.client_caregivers
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for client_documents
CREATE POLICY "Users can view their own client documents" ON public.client_documents
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own client documents" ON public.client_documents
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client documents" ON public.client_documents
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client documents" ON public.client_documents
FOR DELETE USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_care_plans_updated_at
BEFORE UPDATE ON public.care_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_history_updated_at
BEFORE UPDATE ON public.medical_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caregivers_updated_at
BEFORE UPDATE ON public.caregivers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();