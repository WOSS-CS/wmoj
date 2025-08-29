-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update user problem stats after submission
CREATE OR REPLACE FUNCTION public.update_user_problem_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user problem stats
  INSERT INTO public.user_problem_stats (user_id, problem_id, status, attempts, first_solved_at, best_submission_id)
  VALUES (
    NEW.user_id,
    NEW.problem_id,
    CASE WHEN NEW.status = 'accepted' THEN 'solved' ELSE 'attempted' END,
    1,
    CASE WHEN NEW.status = 'accepted' THEN NEW.submitted_at ELSE NULL END,
    CASE WHEN NEW.status = 'accepted' THEN NEW.id ELSE NULL END
  )
  ON CONFLICT (user_id, problem_id) DO UPDATE SET
    status = CASE 
      WHEN NEW.status = 'accepted' THEN 'solved'
      WHEN user_problem_stats.status = 'solved' THEN 'solved'
      ELSE 'attempted'
    END,
    attempts = user_problem_stats.attempts + 1,
    first_solved_at = CASE 
      WHEN NEW.status = 'accepted' AND user_problem_stats.first_solved_at IS NULL 
      THEN NEW.submitted_at 
      ELSE user_problem_stats.first_solved_at 
    END,
    best_submission_id = CASE 
      WHEN NEW.status = 'accepted' THEN NEW.id
      ELSE user_problem_stats.best_submission_id
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Trigger to update user problem stats after submission
DROP TRIGGER IF EXISTS on_submission_created ON public.submissions;
CREATE TRIGGER on_submission_created
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_problem_stats();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update triggers for tables with updated_at columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_problems_updated_at ON public.problems;
CREATE TRIGGER update_problems_updated_at
  BEFORE UPDATE ON public.problems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contests_updated_at ON public.contests;
CREATE TRIGGER update_contests_updated_at
  BEFORE UPDATE ON public.contests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_problem_stats_updated_at ON public.user_problem_stats;
CREATE TRIGGER update_user_problem_stats_updated_at
  BEFORE UPDATE ON public.user_problem_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
