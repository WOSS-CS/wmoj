-- Drop the answer key off the world-readable `problems` table.
--
-- `input`, `output`, `checker` and `generator_file` are the graded data. `problems` is readable by
-- everyone — anon included — and RLS filters ROWS, not COLUMNS, so no policy could ever have hidden
-- them: any student could read the expected stdout of every test case of every problem straight from
-- PostgREST with the publishable key the browser already ships.
--
-- The fix was a staff-only side table, `public.problem_tests`, added earlier and dual-written since.
-- This migration removes the second copy, which is the step that actually closes the hole. Before
-- this, `problem_tests` existed but the answer key was still sitting in `problems` for anyone who
-- asked; the side table only becomes a boundary once the public copy is gone.
--
-- Ordering, deliberately: the application was deployed FIRST, reading and writing only
-- `problem_tests` via the `server-only` service-role client in `lib/supabaseAdmin.ts`, and that
-- deployment was verified live before this ran. Dropping these columns under a deployment that still
-- reads them would break every submission.
--
-- Byte-for-byte parity between the two tables was verified across all 80 problems immediately before
-- this migration: zero rows missing, zero orphans, zero differing in any of the four columns, zero
-- empty test sets. The guard below deliberately does NOT re-check that parity — once the app stopped
-- dual-writing, the `problems` copy is expected to drift and a parity test would fail for the very
-- reason the drop is correct. It checks the invariant that actually matters after the drop: every
-- problem has a usable `problem_tests` row.
--
-- Reversible if it has to be: re-add the four columns and backfill from `public.problem_tests`,
-- which keeps the only copy. Nothing here destroys data that is not stored elsewhere.

do $$
declare
  v_missing   bigint;
  v_unusable  bigint;
begin
  -- On a replay the columns are already gone and there is nothing to guard.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'problems' and column_name = 'input'
  ) then
    raise notice 'legacy graded columns already dropped; skipping guard';
    return;
  end if;

  select count(*) into v_missing
  from public.problems p
  where not exists (select 1 from public.problem_tests t where t.problem_id = p.id);

  if v_missing > 0 then
    raise exception
      'refusing to drop: % problem(s) have no public.problem_tests row and would become ungradeable',
      v_missing;
  end if;

  select count(*) into v_unusable
  from public.problem_tests t
  where t.input is null
     or jsonb_typeof(t.input) <> 'array'
     or jsonb_array_length(t.input) = 0
     or jsonb_typeof(t.output) <> 'array'
     or jsonb_array_length(t.input) <> jsonb_array_length(t.output);

  if v_unusable > 0 then
    raise exception
      'refusing to drop: % public.problem_tests row(s) are empty or ragged', v_unusable;
  end if;
end $$;

alter table public.problems drop column if exists input;
alter table public.problems drop column if exists output;
alter table public.problems drop column if exists checker;
alter table public.problems drop column if exists generator_file;
