-- Update problems table to include user_id and is_public columns
ALTER TABLE public.problems 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create test_cases table for storing problem test cases
CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 1,
  time_limit INTEGER, -- milliseconds, inherits from problem if null
  memory_limit INTEGER, -- MB, inherits from problem if null
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supported_languages table for language configuration
CREATE TABLE IF NOT EXISTS public.supported_languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  judge0_id INTEGER, -- Judge0 language ID
  display_name TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default supported languages
INSERT INTO public.supported_languages (name, judge0_id, display_name, file_extension) VALUES
('python', 71, 'Python 3', 'py'),
('javascript', 63, 'JavaScript (Node.js)', 'js'),
('java', 62, 'Java', 'java'),
('cpp', 54, 'C++ (GCC 9.2.0)', 'cpp'),
('c', 50, 'C (GCC 9.2.0)', 'c'),
('csharp', 51, 'C#', 'cs'),
('go', 60, 'Go', 'go'),
('rust', 73, 'Rust', 'rs'),
('kotlin', 78, 'Kotlin', 'kt'),
('swift', 83, 'Swift', 'swift'),
('php', 68, 'PHP', 'php'),
('ruby', 72, 'Ruby', 'rb'),
('scala', 81, 'Scala', 'scala'),
('dart', 90, 'Dart', 'dart'),
('typescript', 74, 'TypeScript', 'ts')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for test_cases
CREATE INDEX IF NOT EXISTS idx_test_cases_problem_id ON public.test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_is_sample ON public.test_cases(is_sample);
CREATE INDEX IF NOT EXISTS idx_test_cases_order ON public.test_cases(problem_id, order_index);

-- Create indexes for supported_languages
CREATE INDEX IF NOT EXISTS idx_supported_languages_name ON public.supported_languages(name);
CREATE INDEX IF NOT EXISTS idx_supported_languages_active ON public.supported_languages(is_active);

-- Enable Row Level Security on new tables
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;

-- Update indexes for problems table
CREATE INDEX IF NOT EXISTS idx_problems_user_id ON public.problems(user_id);
CREATE INDEX IF NOT EXISTS idx_problems_public ON public.problems(is_public);
CREATE INDEX IF NOT EXISTS idx_problems_slug ON public.problems(slug);
