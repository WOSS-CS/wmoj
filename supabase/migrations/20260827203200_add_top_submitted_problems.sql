-- Rank problems by submission count in the DATABASE, so `/problems` stops doing it wrong in JS.
--
-- The bug: `app/problems/page.tsx` fetched `submissions.problem_id` with NO limit, NO ORDER BY and
-- the error DISCARDED, then tallied in JavaScript and took the top five. PostgREST silently caps an
-- unbounded result set and answers the overflow with HTTP 206 Partial Content, which `postgrest-js`
-- reports as SUCCESS. Past the cap the page therefore received a truncated slice of an arbitrarily
-- ordered table with `error: null` and published a confidently wrong "hot problems" list. The same
-- class of failure the 1,000-row cap causes everywhere it is not handled.
--
-- Why a function and not a REST aggregate: PostgREST aggregate functions are DISABLED on this
-- project — a `select=problem_id,count()` returns PGRST123, verified live. So the aggregate has to
-- live in SQL. (This is NOT the `create_problem_with_tests` RPC that was deliberately rejected; the
-- objection there was to wrapping a staff-only, low-frequency two-table write in an RPC, not to
-- SQL functions as such.)
--
-- SECURITY INVOKER, deliberately: `submissions`' SELECT policy is `using (true)` for anon and
-- authenticated, so an invoker-rights function still sees every row and the count is complete —
-- while a future tightening of that policy would correctly narrow this too. A SECURITY DEFINER
-- function here would be a permanent hole that outlived the policy it was written against.

create or replace function public.top_submitted_problems(limit_count integer default 5)
returns table (problem_id text, submission_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  -- The inner aliases matter: RETURNS TABLE makes `problem_id` an output parameter, which would be
  -- ambiguous against `submissions.problem_id` if referenced unqualified in the same query level.
  select ranked.pid, ranked.n
  from (
    select s.problem_id as pid, count(*)::bigint as n
    from public.submissions s
    group by s.problem_id
    -- `problem_id` breaks count ties so the result is deterministic across calls; without it a
    -- tie makes the "hot" list flicker between page loads for no reason.
    order by count(*) desc, s.problem_id asc
    -- Clamped in the function, not trusted from the caller: this is reachable by `anon` over REST,
    -- and an unclamped `limit_count` would let a stranger ask for the whole table and reintroduce
    -- exactly the unbounded scan this exists to remove. `coalesce` because an explicit
    -- `{"limit_count": null}` over PostgREST bypasses the DEFAULT.
    limit greatest(0, least(coalesce(limit_count, 5), 100))
  ) ranked;
$$;

comment on function public.top_submitted_problems(integer) is
  'Problems ranked by submission count, highest first, ties broken by problem_id. Bounded to at '
  'most 100 rows. Exists because PostgREST aggregates are disabled on this project, so the '
  '/problems "hot problems" rail cannot compute this over REST without an unbounded fetch.';

-- Functions are EXECUTE-to-PUBLIC by default. Say who may call this rather than inheriting it:
-- /problems renders for logged-out visitors, so `anon` genuinely needs it.
revoke execute on function public.top_submitted_problems(integer) from public;
grant execute on function public.top_submitted_problems(integer) to anon, authenticated;
