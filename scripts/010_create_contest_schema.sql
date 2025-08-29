-- Create comprehensive contest system tables

-- Contests table
CREATE TABLE IF NOT EXISTS public.contests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registration_end TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER,
  is_public BOOLEAN DEFAULT true,
  is_rated BOOLEAN DEFAULT true,
  contest_type TEXT DEFAULT 'icpc' CHECK (contest_type IN ('icpc', 'ioi', 'atcoder', 'codeforces')),
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  prize_pool DECIMAL(10,2) DEFAULT 0,
  rules TEXT, -- Contest-specific rules
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contest participants/registrations
CREATE TABLE IF NOT EXISTS public.contest_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  team_name TEXT, -- Optional team name
  is_official BOOLEAN DEFAULT true, -- False for unofficial/virtual participation
  UNIQUE(contest_id, user_id)
);

-- Contest problems (links problems to contests)
CREATE TABLE IF NOT EXISTS public.contest_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  problem_index TEXT NOT NULL, -- A, B, C, etc.
  points INTEGER DEFAULT 100,
  penalty_minutes INTEGER DEFAULT 20, -- Wrong submission penalty
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contest_id, problem_id),
  UNIQUE(contest_id, problem_index),
  UNIQUE(contest_id, order_index)
);

-- Contest submissions (extends regular submissions for contest context)
CREATE TABLE IF NOT EXISTS public.contest_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_from_start INTEGER, -- Minutes from contest start
  verdict TEXT DEFAULT 'pending' CHECK (verdict IN ('accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'pending')),
  points_earned INTEGER DEFAULT 0,
  penalty_time INTEGER DEFAULT 0, -- Total penalty in minutes
  is_final_accepted BOOLEAN DEFAULT false -- True if this is the first AC for this user-problem
);

-- Contest standings/rankings
CREATE TABLE IF NOT EXISTS public.contest_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  total_score INTEGER DEFAULT 0,
  total_penalty INTEGER DEFAULT 0, -- Total penalty time in minutes
  problems_solved INTEGER DEFAULT 0,
  last_submission_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contest_id, user_id)
);

-- Contest problem results (user performance per problem in contest)
CREATE TABLE IF NOT EXISTS public.contest_problem_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES public.problems(id) ON DELETE CASCADE,
  attempts INTEGER DEFAULT 0,
  is_solved BOOLEAN DEFAULT false,
  first_ac_time INTEGER, -- Minutes from contest start when first accepted
  points_earned INTEGER DEFAULT 0,
  penalty_time INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contest_id, user_id, problem_id)
);

-- Contest announcements
CREATE TABLE IF NOT EXISTS public.contest_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_important BOOLEAN DEFAULT false
);

-- Contest clarifications (Q&A during contest)
CREATE TABLE IF NOT EXISTS public.contest_clarifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES public.problems(id) ON DELETE SET NULL, -- NULL for general questions
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES public.profiles(id),
  answered_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT false, -- Whether answer is visible to all
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contests_slug ON public.contests(slug);
CREATE INDEX IF NOT EXISTS idx_contests_start_time ON public.contests(start_time);
CREATE INDEX IF NOT EXISTS idx_contests_end_time ON public.contests(end_time);
CREATE INDEX IF NOT EXISTS idx_contests_created_by ON public.contests(created_by);

CREATE INDEX IF NOT EXISTS idx_contest_registrations_contest ON public.contest_registrations(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_registrations_user ON public.contest_registrations(user_id);

CREATE INDEX IF NOT EXISTS idx_contest_problems_contest ON public.contest_problems(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_problems_problem ON public.contest_problems(problem_id);

CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest ON public.contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_user ON public.contest_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_problem ON public.contest_submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_submitted_at ON public.contest_submissions(submitted_at);

CREATE INDEX IF NOT EXISTS idx_contest_standings_contest ON public.contest_standings(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_standings_rank ON public.contest_standings(contest_id, rank);

CREATE INDEX IF NOT EXISTS idx_contest_problem_results_contest_user ON public.contest_problem_results(contest_id, user_id);

CREATE INDEX IF NOT EXISTS idx_contest_announcements_contest ON public.contest_announcements(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_clarifications_contest ON public.contest_clarifications(contest_id);

-- Enable Row Level Security
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_problem_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_clarifications ENABLE ROW LEVEL SECURITY;
