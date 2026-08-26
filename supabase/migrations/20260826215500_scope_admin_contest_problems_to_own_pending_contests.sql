-- Stop an admin from adding or removing a problem in a contest that is not theirs, or that is live.
--
-- Why: both admin `contest_problems` policies key on the **problem's** owner and say nothing at all
-- about the **contest**:
--
--   (admin is active) AND (problems.created_by = auth.uid())
--
-- So an active admin could run, from a browser console holding the publishable key,
--     supabase.from('contest_problems').delete()
--       .eq('contest_id', <someone else's LIVE rated contest>)
--       .eq('problem_id', <a problem I authored>)
-- and pull their problem out of a contest that is currently running, for every participant, mid-run.
-- The INSERT twin is the mirror image: an admin could inject a problem into another author's live
-- contest.
--
-- This is the same class as the `is_active` pinning applied to the admin `problems`/`contests` write
-- policies — those were fixed and this junction was missed because its policy name does not follow
-- the same pattern. The API routes now reject the cross-author case with a 403, but `AGENTS.md` is
-- explicit that RLS is the real boundary and the routes are not the only path to the table.
--
-- The rule after this: an admin may compose **their own pending contest** out of **their own
-- problems**. Managers keep unrestricted access via their own policies, which is the documented
-- role model — only managers touch an activated contest.

drop policy if exists "Admins can assign own problems to contests" on public.contest_problems;
create policy "Admins can assign own problems to contests" on public.contest_problems
  for insert to authenticated
  with check (
    exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
    and exists (select 1 from public.problems p
                 where p.id = contest_problems.problem_id and p.created_by = auth.uid())
    and exists (select 1 from public.contests c
                 where c.id = contest_problems.contest_id
                   and c.created_by = auth.uid()
                   and c.is_active = false)
  );

drop policy if exists "Admins can remove own problems from contests" on public.contest_problems;
create policy "Admins can remove own problems from contests" on public.contest_problems
  for delete to authenticated
  using (
    exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
    and exists (select 1 from public.problems p
                 where p.id = contest_problems.problem_id and p.created_by = auth.uid())
    and exists (select 1 from public.contests c
                 where c.id = contest_problems.contest_id
                   and c.created_by = auth.uid()
                   and c.is_active = false)
  );
