-- ============================================================================
-- 20260826155233_join_history_user_update_left_at — let users stamp left_at
-- ============================================================================
-- Adds the missing UPDATE policy on public.join_history so a signed-in user
-- can write `left_at` on their OWN join record.
--
-- Why: leaving a contest — either explicitly (POST /api/contests/[id]/leave)
-- or implicitly, when `getTimerStatus` finds the countdown expired — is
-- supposed to stamp `left_at` on the existing (user_id, contest_id) row.
-- join_history had select/insert policies for regular users and an ALL policy
-- for active managers, but no update policy at all, so every one of those
-- writes was silently refused by RLS and `left_at` is NULL for every row in
-- production. (The application-side half of the same bug — an `.upsert()` with
-- no `onConflict`, which targeted the `id` primary key and therefore raised
-- 23505 against `join_history_user_id_contest_id_key` — is fixed in
-- main/src/utils/timerCheck.ts in the same change.)
--
-- Scoped as tightly as the feature needs and no wider: `using` restricts the
-- rows a user may target to their own, and `with check` is required alongside
-- it — without it a user could re-point one of their own rows at another
-- user's id, forging someone else's contest history. Both sides are the same
-- `auth.uid() = user_id` predicate, mirroring the existing
-- "Users can update their own timers" policy on public.countdown_timers.
--
-- No column-level restriction is possible in RLS; a user can therefore also
-- rewrite `joined_at`/`is_virtual` on their own row. That is the same latitude
-- the existing insert policy already grants them over those columns, so this
-- widens nothing beyond a row they already control.
--
-- Idempotent: Postgres has no `create policy if not exists`, so this uses the
-- baseline's `drop policy if exists` + `create policy` pairing.
-- ============================================================================

drop policy if exists "Users can update their own join history" on public.join_history;
create policy "Users can update their own join history"
  on public.join_history for update
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================================
-- Rollback
-- ============================================================================
-- Restores the previous behaviour: regular users can no longer stamp
-- `left_at`, and only active managers can update join_history.
--
-- drop policy if exists "Users can update their own join history" on public.join_history;
