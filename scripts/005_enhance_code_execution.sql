-- Add test_case_results column to submissions table
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS test_case_results JSONB DEFAULT NULL;

-- Create test_cases table for storing problem test cases
CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 1,
  time_limit INTEGER, -- milliseconds, overrides problem default if set
  memory_limit INTEGER, -- MB, overrides problem default if set
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create execution_results table for detailed test case execution
CREATE TABLE IF NOT EXISTS public.execution_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES public.test_cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error')),
  runtime INTEGER, -- milliseconds
  memory_used INTEGER, -- KB
  output TEXT,
  error_message TEXT,
  points_awarded INTEGER DEFAULT 0,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_cases_problem_id ON public.test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_order ON public.test_cases(problem_id, order_index);
CREATE INDEX IF NOT EXISTS idx_execution_results_submission_id ON public.execution_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_execution_results_test_case_id ON public.execution_results(test_case_id);

-- Enable RLS on new tables
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_results ENABLE ROW LEVEL SECURITY;

-- Add some sample test cases for problems
INSERT INTO public.test_cases (problem_id, input, expected_output, is_sample, order_index)
SELECT 
  p.id,
  '5' || E'\n' || '1 2 3 4 5',
  '15',
  true,
  1
FROM public.problems p
WHERE p.slug = 'sum-of-array'
ON CONFLICT DO NOTHING;

INSERT INTO public.test_cases (problem_id, input, expected_output, is_sample, order_index)
SELECT 
  p.id,
  '3' || E'\n' || '10 20 30',
  '60',
  false,
  2
FROM public.problems p
WHERE p.slug = 'sum-of-array'
ON CONFLICT DO NOTHING;

-- Add more comprehensive language support
CREATE TABLE IF NOT EXISTS public.supported_languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  version TEXT,
  file_extension TEXT NOT NULL,
  compile_command TEXT,
  execute_command TEXT NOT NULL,
  default_code TEXT,
  time_multiplier DECIMAL DEFAULT 1.0, -- For language-specific time adjustments
  memory_multiplier DECIMAL DEFAULT 1.0, -- For language-specific memory adjustments
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert supported languages
INSERT INTO public.supported_languages (name, display_name, version, file_extension, execute_command, default_code, time_multiplier, memory_multiplier) VALUES
('python', 'Python', '3.9', 'py', 'python3 {file}', 'def solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()', 1.0, 1.0),
('javascript', 'JavaScript', 'Node.js 18', 'js', 'node {file}', 'function solve() {\n    // Write your solution here\n}\n\nsolve();', 1.0, 1.2),
('java', 'Java', '17', 'java', 'java {class}', 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}', 1.5, 2.0),
('cpp', 'C++', '17', 'cpp', './{executable}', '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}', 1.0, 0.8),
('c', 'C', '11', 'c', './{executable}', '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}', 1.0, 0.8),
('go', 'Go', '1.19', 'go', 'go run {file}', 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n}', 1.0, 1.0),
('rust', 'Rust', '1.65', 'rs', './{executable}', 'fn main() {\n    // Write your solution here\n}', 1.2, 0.9),
('kotlin', 'Kotlin', '1.7', 'kt', 'java -jar {jar}', 'fun main() {\n    // Write your solution here\n}', 1.5, 2.0),
('swift', 'Swift', '5.7', 'swift', 'swift {file}', 'import Foundation\n\nfunc solve() {\n    // Write your solution here\n}\n\nsolve()', 1.3, 1.5),
('csharp', 'C#', '.NET 6', 'cs', 'dotnet run', 'using System;\n\nclass Program {\n    static void Main() {\n        // Write your solution here\n    }\n}', 1.3, 1.8)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  version = EXCLUDED.version,
  updated_at = NOW();

-- Enable RLS on supported_languages table
ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_supported_languages_active ON public.supported_languages(is_active);
CREATE INDEX IF NOT EXISTS idx_supported_languages_name ON public.supported_languages(name) WHERE is_active = true;
