-- Create reference_solutions table for storing author solutions
CREATE TABLE IF NOT EXISTS public.reference_solutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT, -- Optional description of the solution approach
  is_primary BOOLEAN DEFAULT false, -- Mark the main reference solution
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create problem_editorials table for detailed explanations
CREATE TABLE IF NOT EXISTS public.problem_editorials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content explaining the solution
  approach_complexity TEXT, -- Time and space complexity analysis
  hints TEXT[], -- Array of hints for the problem
  related_topics TEXT[], -- Related algorithm/data structure topics
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_published BOOLEAN DEFAULT false
);

-- Create problem_categories table for better organization
CREATE TABLE IF NOT EXISTS public.problem_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES public.problem_categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create problem_category_mappings for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.problem_category_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.problem_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(problem_id, category_id)
);

-- Insert some default categories
INSERT INTO public.problem_categories (name, description) VALUES
('Array', 'Problems involving array manipulation and traversal'),
('String', 'String processing and pattern matching problems'),
('Dynamic Programming', 'Problems requiring dynamic programming techniques'),
('Graph', 'Graph theory and traversal problems'),
('Tree', 'Binary trees, BST, and tree traversal problems'),
('Hash Table', 'Problems using hash tables and dictionaries'),
('Two Pointers', 'Problems solvable with two-pointer technique'),
('Sliding Window', 'Problems using sliding window approach'),
('Binary Search', 'Problems requiring binary search algorithm'),
('Greedy', 'Problems solvable with greedy algorithms'),
('Backtracking', 'Problems requiring backtracking approach'),
('Math', 'Mathematical and number theory problems'),
('Bit Manipulation', 'Problems involving bitwise operations'),
('Stack', 'Problems using stack data structure'),
('Queue', 'Problems using queue data structure'),
('Heap', 'Problems using heap/priority queue'),
('Linked List', 'Problems involving linked list manipulation'),
('Sorting', 'Problems related to sorting algorithms'),
('Searching', 'Problems involving search algorithms'),
('Recursion', 'Problems solvable with recursive approach')
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reference_solutions_problem_id ON public.reference_solutions(problem_id);
CREATE INDEX IF NOT EXISTS idx_reference_solutions_language ON public.reference_solutions(language);
CREATE INDEX IF NOT EXISTS idx_reference_solutions_primary ON public.reference_solutions(is_primary);

CREATE INDEX IF NOT EXISTS idx_problem_editorials_problem_id ON public.problem_editorials(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_editorials_published ON public.problem_editorials(is_published);

CREATE INDEX IF NOT EXISTS idx_problem_categories_parent ON public.problem_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_problem_category_mappings_problem ON public.problem_category_mappings(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_category_mappings_category ON public.problem_category_mappings(category_id);

-- Enable Row Level Security
ALTER TABLE public.reference_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_editorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_category_mappings ENABLE ROW LEVEL SECURITY;
