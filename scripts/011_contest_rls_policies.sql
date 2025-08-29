-- RLS Policies for Contest System

-- Contests policies
CREATE POLICY "Public contests are viewable by everyone" ON public.contests
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create contests" ON public.contests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Contest creators can update their contests" ON public.contests
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Contest creators can delete their contests" ON public.contests
  FOR DELETE USING (created_by = auth.uid());

-- Contest registrations policies
CREATE POLICY "Users can view registrations for public contests" ON public.contest_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_registrations.contest_id 
      AND (contests.is_public = true OR contests.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can register for contests" ON public.contest_registrations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_registrations.contest_id 
      AND contests.is_public = true
      AND NOW() BETWEEN contests.registration_start AND contests.registration_end
    )
  );

CREATE POLICY "Users can update their own registrations" ON public.contest_registrations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can cancel their own registrations" ON public.contest_registrations
  FOR DELETE USING (user_id = auth.uid());

-- Contest problems policies
CREATE POLICY "Contest problems are viewable by participants" ON public.contest_problems
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_problems.contest_id 
      AND (
        contests.is_public = true OR 
        contests.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.contest_registrations 
          WHERE contest_registrations.contest_id = contests.id 
          AND contest_registrations.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Contest creators can manage contest problems" ON public.contest_problems
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_problems.contest_id 
      AND contests.created_by = auth.uid()
    )
  );

-- Contest submissions policies
CREATE POLICY "Users can view contest submissions" ON public.contest_submissions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_submissions.contest_id 
      AND contests.created_by = auth.uid()
    )
  );

CREATE POLICY "Registered users can submit to contests" ON public.contest_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.contest_registrations 
      WHERE contest_registrations.contest_id = contest_submissions.contest_id 
      AND contest_registrations.user_id = auth.uid()
    )
  );

-- Contest standings policies
CREATE POLICY "Contest standings are viewable by participants" ON public.contest_standings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_standings.contest_id 
      AND (
        contests.is_public = true OR 
        contests.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.contest_registrations 
          WHERE contest_registrations.contest_id = contests.id 
          AND contest_registrations.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "System can update contest standings" ON public.contest_standings
  FOR ALL USING (true); -- This will be managed by server-side functions

-- Contest problem results policies  
CREATE POLICY "Users can view their own problem results" ON public.contest_problem_results
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_problem_results.contest_id 
      AND contests.created_by = auth.uid()
    )
  );

CREATE POLICY "System can manage problem results" ON public.contest_problem_results
  FOR ALL USING (true); -- This will be managed by server-side functions

-- Contest announcements policies
CREATE POLICY "Contest announcements are viewable by participants" ON public.contest_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_announcements.contest_id 
      AND (
        contests.is_public = true OR 
        contests.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.contest_registrations 
          WHERE contest_registrations.contest_id = contests.id 
          AND contest_registrations.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Contest creators can manage announcements" ON public.contest_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_announcements.contest_id 
      AND contests.created_by = auth.uid()
    )
  );

-- Contest clarifications policies
CREATE POLICY "Users can view public clarifications and their own questions" ON public.contest_clarifications
  FOR SELECT USING (
    (is_public = true OR user_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_clarifications.contest_id 
      AND (
        contests.is_public = true OR 
        contests.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.contest_registrations 
          WHERE contest_registrations.contest_id = contests.id 
          AND contest_registrations.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Registered users can ask clarifications" ON public.contest_clarifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.contest_registrations 
      WHERE contest_registrations.contest_id = contest_clarifications.contest_id 
      AND contest_registrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Contest creators can answer clarifications" ON public.contest_clarifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.contests 
      WHERE contests.id = contest_clarifications.contest_id 
      AND contests.created_by = auth.uid()
    )
  );
