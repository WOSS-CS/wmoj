-- Make a contest deletable again, and stop two classes of invalid contest row.
--
-- Why: four tables reference `contests(id)` and only `contest_problems` cascades. Both delete
-- handlers carry the comment "ON DELETE CASCADE on contest_problems handles cleanup automatically",
-- which is true for that one table and false for the other three, and neither route pre-deletes
-- them. Since `join_history` is by design a permanent record with no delete path in the app, ANY
-- contest that has ever been joined can never be deleted — Postgres raises 23503 and the route
-- returns a bare `500 Failed to delete contest` with no indication of the cause. The live project
-- has exactly one contest and eight `join_history` rows against it, so the only contest that exists
-- was already permanently undeletable.
--
-- `contest_participants` and `countdown_timers` cascade: they are live session state and mean
-- nothing without their contest.
--
-- `join_history` does NOT cascade. Cascading it would silently erase every student's record of
-- having competed, which is the one thing that table exists to keep. `on delete restrict` makes the
-- refusal explicit so the route can map 23503 to a 409 "deactivate it instead" — which is what
-- `.agents/skills/add-problem/reference/database.md` already tells authors to do.
--
-- The two CHECKs: `length` is used directly as a countdown duration in minutes, so a negative or
-- absent value produces a timer that is already expired and locks every participant out of a contest
-- they just joined. `getContestStatus()` treats both timestamps null as `virtual` and both set as a
-- scheduled window; exactly one set is a state nothing in the app renders correctly.
-- Verified before applying: 1 contest, 0 rows violating either constraint.

alter table public.contest_participants drop constraint if exists contest_participants_contest_id_fkey;
alter table public.contest_participants
  add constraint contest_participants_contest_id_fkey
    foreign key (contest_id) references public.contests(id) on delete cascade;

alter table public.countdown_timers drop constraint if exists countdown_timers_contest_id_fkey;
alter table public.countdown_timers
  add constraint countdown_timers_contest_id_fkey
    foreign key (contest_id) references public.contests(id) on delete cascade;

alter table public.join_history drop constraint if exists join_history_contest_id_fkey;
alter table public.join_history
  add constraint join_history_contest_id_fkey
    foreign key (contest_id) references public.contests(id) on delete restrict;

alter table public.contests drop constraint if exists contests_length_range;
alter table public.contests
  add constraint contests_length_range check (length between 1 and 1440);

alter table public.contests drop constraint if exists contests_window_paired;
alter table public.contests
  add constraint contests_window_paired check ((starts_at is null) = (ends_at is null));
