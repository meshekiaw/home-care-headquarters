
-- LMS Courses table
CREATE TABLE public.lms_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'text',
  content_url TEXT,
  content_body TEXT,
  duration_minutes INTEGER,
  is_required BOOLEAN NOT NULL DEFAULT false,
  required_for_role TEXT,
  category TEXT DEFAULT 'general',
  passing_score INTEGER DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- LMS Course Assignments
CREATE TABLE public.lms_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  assigned_by TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- LMS Policies for acknowledgment
CREATE TABLE public.lms_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  version INTEGER NOT NULL DEFAULT 1,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_acknowledgment BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- LMS Policy Acknowledgments
CREATE TABLE public.lms_policy_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.lms_policies(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(policy_id, caregiver_id)
);

-- LMS Quiz Questions
CREATE TABLE public.lms_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_policy_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for lms_courses
CREATE POLICY "Users can view their own courses" ON public.lms_courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own courses" ON public.lms_courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own courses" ON public.lms_courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own courses" ON public.lms_courses FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for lms_assignments
CREATE POLICY "Users can view their own assignments" ON public.lms_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own assignments" ON public.lms_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assignments" ON public.lms_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assignments" ON public.lms_assignments FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for lms_policies
CREATE POLICY "Users can view their own policies" ON public.lms_policies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own policies" ON public.lms_policies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own policies" ON public.lms_policies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own policies" ON public.lms_policies FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for lms_policy_acknowledgments
CREATE POLICY "Users can view their own acknowledgments" ON public.lms_policy_acknowledgments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own acknowledgments" ON public.lms_policy_acknowledgments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own acknowledgments" ON public.lms_policy_acknowledgments FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for lms_quiz_questions
CREATE POLICY "Users can view their own quiz questions" ON public.lms_quiz_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own quiz questions" ON public.lms_quiz_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quiz questions" ON public.lms_quiz_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quiz questions" ON public.lms_quiz_questions FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_lms_courses_updated_at BEFORE UPDATE ON public.lms_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lms_assignments_updated_at BEFORE UPDATE ON public.lms_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lms_policies_updated_at BEFORE UPDATE ON public.lms_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
