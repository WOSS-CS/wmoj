-- Remove `public.users.is_active` — the per-user ban flag — from the database.
--
-- Settled scope, and the boundary is narrow: this is about the USERS flag only. Every other
-- `is_active` column is untouched and stays meaningful — `problems` (published/pending),
-- `admins`/`managers` (staff deactivation, which `is_admin()`/`is_manager()` still pin to
-- `is_active = true`), `contests`, `countdown_timers`.
--
-- ⚠️ DEPLOY ORDERING. This file is TIMESTAMPED LAST ON PURPOSE, after the two migrations for
-- Phase 4, because it is the one migration that MUST NOT be applied before the application deploy
-- that stops reading the column:
--
--   * `contexts/AuthContext.tsx` tested `is_active !== true`, and `undefined !== true` is TRUE — so
--     dropping the column under the old build force-signs-out EVERY user to /auth/login?disabled=1.
--   * `app/users/page.tsx` and `app/users/[username]/page.tsx` filtered `.eq('is_active', true)`,
--     which would 400 the leaderboard and every profile page.
--
-- Phase 2 therefore has a zero-breakage order that Phase 1 did not: DEPLOY THE APP FIRST, THEN
-- APPLY THIS. The new code never reads the column, so a still-present column is simply unread.
--
-- ---------------------------------------------------------------------------------------------
-- 1. The three cross-table policies that depend on this column. THIS IS THE BLOCKING PART.
-- ---------------------------------------------------------------------------------------------
-- `submissions_insert_own`, `comments_insert_own` and `comment_votes_insert_own` each carry
-- `AND EXISTS (select 1 from users u where u.id = auth.uid() and u.is_active = true)` in their
-- WITH CHECK, recorded in `pg_depend` against this column. They live on OTHER tables, which is why
-- a `users`-only search does not find them.
--
-- They are also the ACTUAL server-side ban boundary — `AuthContext.tsx` said so in its own comment.
--
-- Consequently:
--   * a plain `DROP COLUMN` FAILS with a dependency error, and
--   * `DROP COLUMN ... CASCADE` SILENTLY DROPS ALL THREE, after which no authenticated user can
--     submit, comment or vote — those tables have no other INSERT policy and RLS default-denies.
--     The submit route reports that as `stored: false` rather than as an error, which is exactly
--     the quiet failure mode this repo keeps fighting.
--
-- So rewrite them first, keeping the ownership half and dropping only the ban half. Same name, same
-- command, same role, same permissiveness — only the `is_active` conjunct goes.

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own" on public.submissions
  as permissive for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  as permissive for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "comment_votes_insert_own" on public.comment_votes;
create policy "comment_votes_insert_own" on public.comment_votes
  as permissive for insert to authenticated
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------------------------
-- 2. The self-delete bypass.
-- ---------------------------------------------------------------------------------------------
-- `Users can delete own profile` is a DELETE policy with `roles = {}` — i.e. PUBLIC, so both `anon`
-- and `authenticated` are in scope — and it has zero callers in the application. Only `comments`
-- and `news_posts` FK-reference `users`, both ON DELETE CASCADE, and `submissions.user_id` has NO
-- FK at all, so a self-delete ORPHANS a user's submissions rather than being blocked by them.
--
-- With the ban flag gone this is the last remaining way for an account to disappear, and it is one
-- nobody asked for. Remove the policy and the grant behind it.

drop policy if exists "Users can delete own profile" on public.users;

-- ---------------------------------------------------------------------------------------------
-- 3. Privileges that were never needed, from the schema's default ACL.
-- ---------------------------------------------------------------------------------------------
-- `pg_default_acl` for schema `public` grants anon/authenticated ALL on every new table, so `users`
-- carried DELETE, TRUNCATE, REFERENCES and TRIGGER for both roles purely by default. DELETE is now
-- policy-less, and TRUNCATE is NOT subject to RLS at all — it is the one privilege here that no
-- policy can restrain, which is precisely why leaving it granted is not harmless.
--
-- `anon`'s INSERT goes too: the `Users can insert own profile` policy checks `auth.uid() = id`, and
-- `auth.uid()` is null for `anon`, so it could never have succeeded. `authenticated` keeps INSERT
-- (AuthContext creates the profile row on first sign-in), its column-scoped UPDATE, and SELECT.
-- `anon` keeps the column-scoped SELECT granted by the previous migration.

revoke delete, truncate, references, trigger on public.users from anon, authenticated;
revoke insert on public.users from anon;

-- ---------------------------------------------------------------------------------------------
-- 4. Drop the column.
-- ---------------------------------------------------------------------------------------------
-- NEVER `CASCADE` here. Step 1 removed the only three dependencies; if this still errors, something
-- was missed and the right response is to stop and look, not to let CASCADE delete it for you.

alter table public.users drop column is_active;
