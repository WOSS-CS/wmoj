-- Close the two open write paths RLS was supposed to be guarding, and make "disabled user" mean
-- something at the database boundary.
--
-- This is the most consequential migration in this set. Three independent gaps composed into full
-- leaderboard forgery, from a LOGGED-OUT browser tab holding only the publishable key that ships in
-- the bundle by design:
--
--   1. The `submissions` INSERT policy was named "for authenticated" but granted `to public` — which
--      in Postgres includes `anon` — `with check (true)`. No `auth.uid() = user_id` predicate.
--      `submissions` has no foreign keys at all, so `user_id` could name anyone, and `status` is
--      GENERATED ALWAYS from the caller-supplied `summary`, so writing `summary` IS writing the
--      verdict.
--   2. Both recalculation RPCs are SECURITY DEFINER, take the target uid as a PARAMETER, contain no
--      authorization check, and no migration ever revoked the default PUBLIC EXECUTE — so an
--      attacker could point them at any uid, including a victim's.
--   3. `authenticated` held a table-level UPDATE grant on `public.users`, whose "Users can update own
--      profile" policy has no column granularity. `points` and `problems_solved` — the exact two
--      columns `/users` ranks on — were directly writable by their owner, as were `is_active` and
--      `email`.
--
-- Note that AGENTS.md's "RLS is broadly permissive" note covers READS only. These are writes and
-- were never documented as deliberate.
--
-- Column privileges are checked IN ADDITION to RLS, which is what makes the `users` fix work without
-- touching the row policy: the row genuinely is the caller's, so no WITH CHECK expression could have
-- stopped it. `is_active` is deliberately EXCLUDED from the re-grant so a disabled user cannot
-- re-enable themselves.
--
-- The `users.is_active` predicates implement the disabled-user decision at the real boundary. The app
-- blocks login, but an already-issued JWT keeps working against PostgREST until it expires, so the
-- app check is the UX and these policies are the enforcement.
--
-- ORDERING: the submit route must already surface a failed insert before this lands. Tightening the
-- INSERT policy creates a new way for the insert to fail, and until that fix shipped the failure was
-- swallowed and the student was told they passed.

drop policy if exists "Allow insert for authenticated" on public.submissions;
create policy "submissions_insert_own" on public.submissions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.users u where u.id = auth.uid() and u.is_active = true)
  );

-- Callers run on the user's own token, so give them one guarded entry point instead of two
-- unguarded ones.
create or replace function public.recalc_user_stats(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is distinct from target and not public.is_manager() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  perform public.recalculate_problems_solved(target);
  perform public.recalculate_user_points(target);
end;
$$;

revoke execute on function public.recalculate_user_points(uuid)     from public, anon, authenticated;
revoke execute on function public.recalculate_problems_solved(uuid) from public, anon, authenticated;
revoke execute on function public.recalc_user_stats(uuid)           from public, anon;
grant  execute on function public.recalc_user_stats(uuid)           to authenticated;

revoke update on public.users from authenticated, anon;
grant  update (username, about_me, profile_data, updated_at) on public.users to authenticated;

-- A disabled user may read the site but may not act on it.
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.users u where u.id = auth.uid() and u.is_active = true)
  );

drop policy if exists "comment_votes_insert_own" on public.comment_votes;
create policy "comment_votes_insert_own" on public.comment_votes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.users u where u.id = auth.uid() and u.is_active = true)
  );
