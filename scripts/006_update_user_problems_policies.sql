-- RLS Policies for user-created problems and test cases

-- Problems table policies (updated for user_id and is_public)
DROP POLICY IF EXISTS "Problems are viewable by everyone" ON public.problems;
DROP POLICY IF EXISTS "Users can insert their own problems" ON public.problems;
DROP POLICY IF EXISTS "Users can update their own problems" ON public.problems;
DROP POLICY IF EXISTS "Users can delete their own problems" ON public.problems;

-- Updated problems policies
CREATE POLICY "Public problems are viewable by everyone" ON public.problems
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own problems" ON public.problems
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own problems" ON public.problems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own problems" ON public.problems
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own problems" ON public.problems
  FOR DELETE USING (auth.uid() = user_id);

-- Test cases policies
CREATE POLICY "Test cases are viewable if problem is viewable" ON public.test_cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.problems 
      WHERE problems.id = test_cases.problem_id 
      AND (problems.is_public = true OR problems.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage test cases for their problems" ON public.test_cases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.problems 
      WHERE problems.id = test_cases.problem_id 
      AND problems.user_id = auth.uid()
    )
  );

-- Supported languages policies
CREATE POLICY "Supported languages are viewable by everyone" ON public.supported_languages
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage supported languages" ON public.supported_languages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.username = 'admin'
    )
  );
