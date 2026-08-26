-- Make deactivating a manager actually revoke something.
--
-- Why, in three parts:
--
-- 1. `managers_select_all` was `using ((auth.uid() = id) or is_manager())`. The first disjunct hands
--    a deactivated manager their own row, and eleven-plus app sites treat the mere EXISTENCE of a
--    `managers` row as authorization — `.from('managers').select('id').eq('id', userId)` — so the
--    database was actively defeating the app's revocation. The `admins` twin is
--    `using (is_admin())`, and `is_admin()` requires `is_active`, which is the only reason the admin
--    tree fails closed. Making managers symmetric with admins is the fix; `is_manager()` already
--    requires `is_active = true`, so an ACTIVE manager still reads every row exactly as before.
--
-- 2. `managers_delete_comments` and `managers_all_comment_votes` tested `managers.id = auth.uid()`
--    with NO `is_active` clause, unlike their nine siblings. Comment deletion is the one manager-only
--    mutation that does not go through an API route — it is a direct browser-client `.delete()` — so
--    a deactivated manager could really wipe every comment on the site.
--
-- 3. `managers_update_own` placed no restriction on WHICH columns may change, and `authenticated`
--    held a table-level UPDATE grant, so one console line
--    (`update managers set is_active = true where id = me`) undid the revocation entirely. RLS has no
--    column granularity, so the grant does the work: the only self-write the app performs is the
--    `last_login`/`updated_at` stamp in `AuthContext`.
--
-- `admins` had no self-UPDATE policy at all, so `admins.last_login`/`updated_at` could never be
-- written. It gets one here, column-scoped from birth so it cannot repeat this bug.

drop policy if exists "managers_select_all" on public.managers;
create policy "managers_select_all" on public.managers
  for select to authenticated
  using (public.is_manager());

drop policy if exists "managers_delete_comments" on public.comments;
create policy "managers_delete_comments" on public.comments
  for delete to authenticated
  using (public.is_manager());

drop policy if exists "managers_all_comment_votes" on public.comment_votes;
create policy "managers_all_comment_votes" on public.comment_votes
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Column privileges are checked in ADDITION to RLS, so the row policy can stay as-is.
revoke update on public.managers from authenticated, anon;
grant  update (last_login, updated_at) on public.managers to authenticated;

drop policy if exists "admins_update_own" on public.admins;
create policy "admins_update_own" on public.admins
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.admins from authenticated, anon;
grant  update (last_login, updated_at) on public.admins to authenticated;
