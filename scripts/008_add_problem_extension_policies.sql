-- RLS Policies for extended problem tables

-- Reference Solutions policies
CREATE POLICY "Reference solutions are viewable if problem is viewable" ON public.reference_solutions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.problems 
      WHERE problems.id = reference_solutions.problem_id 
      AND (problems.is_public = true OR problems.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage reference solutions for their problems" ON public.reference_solutions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.problems 
      WHERE problems.id = reference_solutions.problem_id 
      AND problems.user_id = auth.uid()
    )
  );

-- Problem Editorials policies
CREATE POLICY "Published editorials are viewable if problem is viewable" ON public.problem_editorials
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM public.problems 
      WHERE problems.id = problem_editorials.problem_id 
      AND (problems.is_public = true OR problems.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their own editorials" ON public.problem_editorials
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can manage editorials for their problems" ON public.problem_editorials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.problems 
      WHERE problems.id = problem_editorials.problem_id 
      AND problems.user_id = auth.uid()
    )
  );

-- Problem Categories policies (read-only for most users)
CREATE POLICY "Categories are viewable by everyone" ON public.problem_categories
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories" ON public.problem_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.username = 'admin'
    )
  );

-- Problem Category Mappings policies
CREATE POLICY "Category mappings are viewable if problem is viewable" ON public.problem_category_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.problems 
      WHERE problems.id = problem_category_mappings.problem_id 
      AND (problems.is_public = true OR problems.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage category mappings for their problems" ON public.problem_category_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.problems 
      WHERE problems.id = problem_category_mappings.problem_id 
      AND problems.user_id = auth.uid()
    )
  );
