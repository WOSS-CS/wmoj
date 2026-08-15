-- ============================================================================
-- 20260815224846_add_problem_checker — custom checker support
-- ============================================================================
-- Adds a nullable `checker` column to public.problems holding the C++ source
-- of an optional custom checker program.
--
-- Why: some problems accept more than one valid answer (any optimal path, any
-- valid permutation, floating-point answers within a tolerance, ...). Byte
-- comparison against a single stored expected output rejects correct
-- solutions for those. `wmoj-judge` now accepts an optional `checker` field on
-- POST /submit; when present it compiles that source and asks it to rule on
-- each test case instead of comparing bytes.
--
-- Nullable with no default on purpose: NULL / empty means "no checker", which
-- is the behaviour every existing problem already has, so the 50+ live
-- problems keep grading by exact comparison and the app omits the field from
-- the judge payload entirely for them.
--
-- No RLS change is needed. `problems` is already world-readable under the
-- existing select policy, so the new column inherits it — the same as the
-- test data and `generator_file`, which are likewise readable today.
-- ============================================================================

alter table public.problems
  add column if not exists checker text;

comment on column public.problems.checker is
  'Optional C++ source for a custom checker program. NULL/empty means the judge falls back to exact output comparison. Sent to wmoj-judge as the `checker` field of POST /submit.';


-- ============================================================================
-- Rollback
-- ============================================================================
-- Destructive: dropping the column discards every stored checker source.
--
-- alter table public.problems
--   drop column if exists checker;
