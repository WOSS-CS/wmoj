-- Move the graded data (test inputs, EXPECTED OUTPUTS, custom checker source, generator source)
-- off the world-readable `problems` table and onto a staff-only side table.
--
-- Why: `problems`' only SELECT policy is `using (true)` granted to `public`, and the table holds
-- `output` — the answer key. Any visitor holding the publishable key (which ships in the browser
-- bundle by design) could read every problem's expected output with one PostgREST call and score AC
-- without solving anything. Every rated result on the platform was unverifiable. The repo's own
-- `main/src/types/problem.ts` already asserts the opposite invariant ("Staff-only — never selected
-- into client-facing payloads"), so this was never the intent.
--
-- Why a side table rather than tightening the policy: Postgres RLS filters ROWS, not columns. There
-- is no policy that hides `output` from an anonymous caller while keeping `content` public. Column
-- privileges could do it, but they are not role-aware, so revoking from `authenticated` would also
-- revoke from staff — forcing every staff editor through elevated credentials too. A separate table
-- lets RLS express "staff only" properly, so only the one genuinely impossible case (the submit
-- route reading the answer key on behalf of a student who must not see it) needs elevation.
--
-- The submit route reads this table with the service-role key via `main/src/lib/supabaseAdmin.ts`,
-- server-side only. Staff editors and both generator routes keep using the ordinary client and are
-- authorised by the policies below.
--
-- `problems.input/output/checker/generator_file` are LEFT IN PLACE by this migration and dropped by
-- a later one, only once every reader and writer has been repointed and verified. Landing the table
-- and the drop together would take the site down.

create table if not exists public.problem_tests (
  problem_id     text primary key references public.problems(id) on delete cascade,
  input          jsonb not null default '[]'::jsonb,
  output         jsonb not null default '[]'::jsonb,
  checker        text,
  generator_file text,
  updated_at     timestamptz not null default now()
);

comment on table public.problem_tests is
  'Graded data for a problem: test inputs, expected outputs, custom checker and generator source. '
  'Staff-readable only. Never expose these columns to anon or to a client component — the expected '
  'outputs are the answer key.';

-- Backfill from the existing columns. Idempotent so a re-run is harmless.
insert into public.problem_tests (problem_id, input, output, checker, generator_file)
select p.id, p.input, p.output, p.checker, p.generator_file
from public.problems p
on conflict (problem_id) do nothing;

alter table public.problem_tests enable row level security;

-- No anon policy at all, and no policy for ordinary authenticated users: a student must never be
-- able to read this table, which is the entire point.

drop policy if exists "problem_tests_staff_select" on public.problem_tests;
create policy "problem_tests_staff_select" on public.problem_tests
  for select to authenticated
  using (
    public.is_manager()
    or exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active = true)
  );

-- Managers own everything.
drop policy if exists "problem_tests_managers_all" on public.problem_tests;
create policy "problem_tests_managers_all" on public.problem_tests
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Admins may write the graded data for their own PENDING problems only, mirroring the `is_active`
-- pinning applied to the admin `problems` policies: an admin may prepare their own unpublished work
-- and may not touch anything already live.
drop policy if exists "problem_tests_admins_write_own_pending" on public.problem_tests;
create policy "problem_tests_admins_write_own_pending" on public.problem_tests
  for all to authenticated
  using (
    exists (
      select 1 from public.problems p
      join public.admins a on a.id = auth.uid() and a.is_active = true
      where p.id = problem_tests.problem_id
        and p.created_by = auth.uid()
        and p.is_active = false
    )
  )
  with check (
    exists (
      select 1 from public.problems p
      join public.admins a on a.id = auth.uid() and a.is_active = true
      where p.id = problem_tests.problem_id
        and p.created_by = auth.uid()
        and p.is_active = false
    )
  );

-- RLS is the boundary, but do not hand anon a table-level grant it has no policy for.
revoke all on public.problem_tests from anon;
grant select, insert, update, delete on public.problem_tests to authenticated;
