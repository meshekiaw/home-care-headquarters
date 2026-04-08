
-- Create orientation_modules table
CREATE TABLE public.orientation_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orientation_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orientation modules" ON public.orientation_modules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orientation modules" ON public.orientation_modules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orientation modules" ON public.orientation_modules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orientation modules" ON public.orientation_modules FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_orientation_modules_updated_at BEFORE UPDATE ON public.orientation_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create orientation_progress table
CREATE TABLE public.orientation_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  current_section INTEGER NOT NULL DEFAULT 1,
  sections_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orientation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orientation progress" ON public.orientation_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orientation progress" ON public.orientation_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orientation progress" ON public.orientation_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orientation progress" ON public.orientation_progress FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_orientation_progress_updated_at BEFORE UPDATE ON public.orientation_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create orientation_quizzes table
CREATE TABLE public.orientation_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orientation_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orientation quizzes" ON public.orientation_quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orientation quizzes" ON public.orientation_quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orientation quizzes" ON public.orientation_quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orientation quizzes" ON public.orientation_quizzes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_orientation_quizzes_updated_at BEFORE UPDATE ON public.orientation_quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create orientation-audio storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('orientation-audio', 'orientation-audio', true);

CREATE POLICY "Anyone can view orientation audio" ON storage.objects FOR SELECT USING (bucket_id = 'orientation-audio');
CREATE POLICY "Authenticated users can upload orientation audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'orientation-audio' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update orientation audio" ON storage.objects FOR UPDATE USING (bucket_id = 'orientation-audio' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete orientation audio" ON storage.objects FOR DELETE USING (bucket_id = 'orientation-audio' AND auth.role() = 'authenticated');
