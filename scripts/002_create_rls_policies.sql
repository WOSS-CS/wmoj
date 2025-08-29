-- Profiles policies
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Problems policies (public read, authenticated users can create)
CREATE POLICY "problems_select_active" ON public.problems FOR SELECT USING (is_active = true);
CREATE POLICY "problems_insert_authenticated" ON public.problems FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "problems_update_creator" ON public.problems FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "problems_delete_creator" ON public.problems FOR DELETE USING (auth.uid() = created_by);

-- Contests policies (public read, authenticated users can create)
CREATE POLICY "contests_select_public" ON public.contests FOR SELECT USING (is_public = true);
CREATE POLICY "contests_insert_authenticated" ON public.contests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "contests_update_creator" ON public.contests FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "contests_delete_creator" ON public.contests FOR DELETE USING (auth.uid() = created_by);

-- Contest problems policies (public read for public contests)
CREATE POLICY "contest_problems_select_public" ON public.contest_problems FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.contests 
    WHERE contests.id = contest_problems.contest_id 
    AND contests.is_public = true
  )
);
CREATE POLICY "contest_problems_insert_contest_creator" ON public.contest_problems FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contests 
    WHERE contests.id = contest_id 
    AND contests.created_by = auth.uid()
  )
);
CREATE POLICY "contest_problems_update_contest_creator" ON public.contest_problems FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.contests 
    WHERE contests.id = contest_id 
    AND contests.created_by = auth.uid()
  )
);
CREATE POLICY "contest_problems_delete_contest_creator" ON public.contest_problems FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.contests 
    WHERE contests.id = contest_id 
    AND contests.created_by = auth.uid()
  )
);

-- Contest registrations policies
CREATE POLICY "contest_registrations_select_own_or_public" ON public.contest_registrations FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.contests 
    WHERE contests.id = contest_id 
    AND contests.is_public = true
  )
);
CREATE POLICY "contest_registrations_insert_own" ON public.contest_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contest_registrations_delete_own" ON public.contest_registrations FOR DELETE USING (auth.uid() = user_id);

-- Submissions policies
CREATE POLICY "submissions_select_own_or_public_contest" ON public.submissions FOR SELECT USING (
  auth.uid() = user_id OR 
  (contest_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.contests 
    WHERE contests.id = contest_id 
    AND contests.is_public = true
  ))
);
CREATE POLICY "submissions_insert_own" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "submissions_update_own" ON public.submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "submissions_delete_own" ON public.submissions FOR DELETE USING (auth.uid() = user_id);

-- User problem stats policies
CREATE POLICY "user_problem_stats_select_own" ON public.user_problem_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_problem_stats_insert_own" ON public.user_problem_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_problem_stats_update_own" ON public.user_problem_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_problem_stats_delete_own" ON public.user_problem_stats FOR DELETE USING (auth.uid() = user_id);
