-- Stop an admin from publishing their own unreviewed work, or mutating an already-live row.
--
-- Why: the admin INSERT policies deliberately pin new rows pending with `and is_active = false`,
-- which is what makes "admin creations land pending" work. The matching UPDATE policies drop that
-- clause from BOTH `using` and `with check`, and the DELETE policies never had it. Since the browser
-- holds the publishable key and `authenticated` has table-level UPDATE/DELETE on both tables, an
-- admin could run
--     supabase.from('problems').update({ is_active: true, points: 10000 }).eq('id','my-draft')
-- straight from the console: the problem goes live with no manager review, at an arbitrary points
-- value that also bypasses the API route's `Number.isInteger(points) && points >= 1` validation, its
-- test data becomes public, and submissions against it start feeding the scoring RPCs.
--
-- The clause goes on `using` as well as `with check`. `with check` alone would only stop them
-- flipping the flag; it would still let an admin edit a live problem they own.
--
-- After this, activation reaches only `managers_all_problems` / `managers_all_contests`, which is
-- the documented role model: only managers flip `is_active`.

drop policy if exists "Admins can update own problems" on public.problems;
create policy "Admins can update own problems" on public.problems
  for update to authenticated
  using      (exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
              and created_by = auth.uid() and is_active = false)
  with check (exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
              and created_by = auth.uid() and is_active = false);

drop policy if exists "Admins can delete own problems" on public.problems;
create policy "Admins can delete own problems" on public.problems
  for delete to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
         and created_by = auth.uid() and is_active = false);

drop policy if exists "Admins can update own contests" on public.contests;
create policy "Admins can update own contests" on public.contests
  for update to authenticated
  using      (exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
              and created_by = auth.uid() and is_active = false)
  with check (exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
              and created_by = auth.uid() and is_active = false);

drop policy if exists "Admins can delete own contests" on public.contests;
create policy "Admins can delete own contests" on public.contests
  for delete to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
         and created_by = auth.uid() and is_active = false);
