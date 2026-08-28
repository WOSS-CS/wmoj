-- The one server-side path that ends an expired contest run.
--
-- Until now expiry cleanup lived inside `getTimerStatus`, a function named like a read, behind
-- `GET /api/contests/[id]/timer`, which the countdown context called on every page load. The GET
-- is now a pure read, so cleanup needs an owner that does not depend on any one user's browser:
-- this function, called at the top of POST /join and POST /leave. It is parameterless and removes
-- only rows whose timer window has provably closed, so any authenticated caller may run it.
--
-- ORDER MATTERS inside: stamp history, drop participants, drop timers — the timer row is what
-- identifies the other two, so it goes last.

create or replace function public.sweep_expired_participation()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  swept integer := 0;
begin
  -- 1. left_at is the instant the run ENDED, not now(): the leaderboard's scoring window reads it,
  --    and a sweep that happens to run an hour later must not extend anyone's window.
  update public.join_history jh
     set left_at = t.started_at + make_interval(mins => t.duration_minutes)
    from public.countdown_timers t
   where jh.user_id = t.user_id
     and jh.contest_id = t.contest_id
     and jh.left_at is null
     and t.started_at + make_interval(mins => t.duration_minutes) <= now();

  -- 2. ONLY participants whose timer has expired. A participant row with no timer at all is a join
  --    in flight (the join route inserts the participant, then the timer); touching it here would
  --    race that insert. A null started_at never matches: conservative for a delete.
  delete from public.contest_participants cp
   using public.countdown_timers t
   where cp.user_id = t.user_id
     and cp.contest_id = t.contest_id
     and t.started_at + make_interval(mins => t.duration_minutes) <= now();
  get diagnostics swept = row_count;

  -- 3. The timers themselves.
  delete from public.countdown_timers t
   where t.started_at + make_interval(mins => t.duration_minutes) <= now();

  return swept;
end;
$$;

revoke execute on function public.sweep_expired_participation() from public, anon;
grant  execute on function public.sweep_expired_participation() to authenticated;
