-- ============================================================================
-- WMOJ Database Schema
-- ============================================================================
-- This file recreates the complete WMOJ database schema as it exists in
-- production. Paste this into the SQL editor of a fresh Supabase project and
-- run it once. The script is idempotent: every CREATE statement is guarded by
-- IF NOT EXISTS, OR REPLACE, or DROP IF EXISTS, so it can be safely re-run.
--
-- Authentication relies on Supabase's built-in `auth.users` table — we do
-- NOT recreate it here. Foreign keys reference `auth.users(id)` directly.
--
-- Sections (in execution order so there are no forward-reference errors):
--   1. Extensions
--   2. Helper functions used by RLS policies (is_admin, is_manager)
--   3. Trigger / utility functions
--   4. Tables (with RLS enabled)
--   5. Indexes
--   6. RLS policies
--   7. RPC functions (recalculate_*, is_email_registered, ...)
--   8. Triggers
--   9. Storage buckets + storage.objects policies
-- ============================================================================


-- ============================================================================
-- 1. Extensions
-- ============================================================================
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto"  with schema extensions;
-- pg_stat_statements is auto-enabled by Supabase, but harmless to declare.
create extension if not exists "pg_stat_statements" with schema extensions;


-- ============================================================================
-- 2. Helper functions (referenced by RLS policies below).
--    Defined BEFORE policies so policy creation does not fail.
-- ============================================================================

-- Returns true when the calling user is an active admin.
create or replace function public.is_admin()
returns boolean
language sql
stable security definer
as $$
  select exists (
    select 1 from public.admins where id = auth.uid() and is_active = true
  );
$$;

-- Returns true when the calling user is an active manager.
create or replace function public.is_manager()
returns boolean
language sql
stable security definer
as $$
  select exists (
    select 1 from public.managers where id = auth.uid() and is_active = true
  );
$$;


-- ============================================================================
-- 3. Trigger / utility functions
-- ============================================================================

-- Generic updated_at bumper used by tables that want auto-updated timestamps.
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Specific updated_at trigger for news_posts.
create or replace function public.set_news_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Recompute a comment's score after a vote insert/update/delete.
create or replace function public.update_comment_score()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'DELETE' then
    update public.comments
    set score = coalesce((select sum(value) from public.comment_votes where comment_id = old.comment_id), 0)
    where id = old.comment_id;
    return old;
  else
    update public.comments
    set score = coalesce((select sum(value) from public.comment_votes where comment_id = new.comment_id), 0)
    where id = new.comment_id;
    return new;
  end if;
end;
$$;


-- ============================================================================
-- 4. Tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- public.users
--   Application-level user profile, 1:1 with auth.users.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text not null unique,
  email            text not null unique,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_login       timestamptz,
  is_active        boolean default true,
  profile_data     jsonb default '{}'::jsonb,
  problems_solved  integer not null default 0,
  about_me         text,
  points           double precision not null default 0,
  constraint users_username_format check (username ~ '^[a-zA-Z0-9_.\-]{1,30}$')
);
alter table public.users enable row level security;

-- ---------------------------------------------------------------------------
-- public.admins
--   Membership table: a row here means the user has admin privileges.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  last_login  timestamptz,
  is_active   boolean default true
);
alter table public.admins enable row level security;

-- ---------------------------------------------------------------------------
-- public.managers
--   Membership table: a row here means the user has manager privileges
--   (a tier above admin — managers can manage users, news posts, etc.).
-- ---------------------------------------------------------------------------
create table if not exists public.managers (
  id          uuid primary key references auth.users(id),
  last_login  timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  is_active   boolean default true
);
comment on table public.managers is 'Table for users with the Manager role.';
alter table public.managers enable row level security;

-- ---------------------------------------------------------------------------
-- public.problems
--   Programming problems. id is a human-friendly slug (text), not a uuid.
-- ---------------------------------------------------------------------------
create table if not exists public.problems (
  id              text primary key,
  name            text not null,
  content         text not null,
  input           jsonb not null default '[]'::jsonb,
  output          jsonb not null default '[]'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  is_active       boolean default false,
  time_limit      integer not null default 5000,
  memory_limit    integer not null default 256,
  created_by      uuid references auth.users(id),
  points          integer not null,
  generator_file  text,
  constraint problems_id_format check (id ~ '^[a-zA-Z0-9_\-]{1,60}$')
);
comment on column public.problems.time_limit   is 'Time limit in milliseconds';
comment on column public.problems.memory_limit is 'Memory limit in MB';
alter table public.problems enable row level security;

-- ---------------------------------------------------------------------------
-- public.contests
--   Contests that group sets of problems with a time window + duration.
-- ---------------------------------------------------------------------------
create table if not exists public.contests (
  id           text primary key,
  name         text not null,
  description  text,
  length       integer not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  is_active    boolean not null default false,
  created_by   uuid references auth.users(id),
  starts_at    timestamptz,
  ends_at      timestamptz,
  is_rated     boolean not null default false,
  constraint contests_id_format check (id ~ '^[a-zA-Z0-9_\-]{1,60}$')
);
comment on column public.contests.starts_at is 'When the regular (ranked) time window begins. NULL = no scheduled window.';
comment on column public.contests.ends_at   is 'When the regular (ranked) time window ends. NULL = no scheduled window.';
comment on column public.contests.is_rated  is 'Whether this contest affects rating. No rating logic yet; stored for future use.';
alter table public.contests enable row level security;

-- ---------------------------------------------------------------------------
-- public.contest_problems
--   Junction table linking contests <-> problems (many-to-many).
-- ---------------------------------------------------------------------------
create table if not exists public.contest_problems (
  contest_id  text not null references public.contests(id) on delete cascade,
  problem_id  text not null references public.problems(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (contest_id, problem_id)
);
alter table public.contest_problems enable row level security;

-- ---------------------------------------------------------------------------
-- public.contest_participants
--   Active participants in a contest (each user can be in only one contest
--   at a time in practice, enforced by application logic + helper RPCs).
-- ---------------------------------------------------------------------------
create table if not exists public.contest_participants (
  contest_id  text not null references public.contests(id),
  user_id     uuid not null references auth.users(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (contest_id, user_id)
);
alter table public.contest_participants enable row level security;

-- ---------------------------------------------------------------------------
-- public.join_history
--   Permanent record that a user joined a contest. Used to gate rejoin
--   behaviour and to compute "contests written" stats.
-- ---------------------------------------------------------------------------
create table if not exists public.join_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  contest_id  text not null references public.contests(id),
  joined_at   timestamptz default now(),
  left_at     timestamptz,
  is_virtual  boolean not null default false,
  unique (user_id, contest_id)
);
comment on column public.join_history.is_virtual is 'True when the user joined while the contest was in virtual status.';
alter table public.join_history enable row level security;

-- ---------------------------------------------------------------------------
-- public.countdown_timers
--   Per-user, per-contest countdown timer. One row per (user, contest).
-- ---------------------------------------------------------------------------
create table if not exists public.countdown_timers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  contest_id        text not null references public.contests(id),
  started_at        timestamptz default now(),
  duration_minutes  integer not null,
  is_active         boolean default true,
  unique (user_id, contest_id)
);
alter table public.countdown_timers enable row level security;

-- ---------------------------------------------------------------------------
-- public.submissions
--   One row per code submission to the judge. `status` is a generated column
--   computed from the JSON `summary` ('passed' if all tests passed, else 'failed').
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  problem_id  text not null,
  user_id     uuid not null,
  language    text not null,
  code        text not null,
  input       jsonb not null default '[]'::jsonb,
  output      jsonb not null default '[]'::jsonb,
  results     jsonb,
  summary     jsonb,
  status      text generated always as (
    case
      when (coalesce(((summary ->> 'failed'::text))::integer, 0) = 0)
       and (coalesce(((summary ->> 'total'::text))::integer, 0) > 0)
        then 'passed'::text
      else 'failed'::text
    end
  ) stored,
  created_at  timestamptz default now(),
  constraint submissions_language_check check (
    language = any (array['python3','pypy3','cpp14','cpp17','cpp20','cpp23','python','cpp'])
  )
);
alter table public.submissions enable row level security;

-- ---------------------------------------------------------------------------
-- public.comments
--   Threaded comments on problems. Self-referential parent_id for replies.
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  problem_id  text not null references public.problems(id) on delete cascade,
  user_id     uuid not null references public.users(id)    on delete cascade,
  body        text not null,
  score       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  parent_id   uuid references public.comments(id) on delete cascade,
  constraint comments_body_check check (char_length(body) >= 1 and char_length(body) <= 10000)
);
alter table public.comments enable row level security;

-- ---------------------------------------------------------------------------
-- public.comment_votes
--   One row per (user, comment) — value is +1 or -1.
-- ---------------------------------------------------------------------------
create table if not exists public.comment_votes (
  id          uuid primary key default gen_random_uuid(),
  comment_id  uuid not null references public.comments(id) on delete cascade,
  user_id     uuid not null references auth.users(id)      on delete cascade,
  value       smallint not null,
  created_at  timestamptz not null default now(),
  constraint comment_votes_value_check check (value = any (array[-1, 1])),
  unique (comment_id, user_id)
);
alter table public.comment_votes enable row level security;

-- ---------------------------------------------------------------------------
-- public.news_posts
--   News / announcements posted by managers, shown on the dashboard.
-- ---------------------------------------------------------------------------
create table if not exists public.news_posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null,
  uid          uuid not null references public.users(id) on delete cascade,
  date_posted  timestamptz not null default now(),
  updated_at   timestamptz default now()
);
alter table public.news_posts enable row level security;


-- ============================================================================
-- 5. Indexes
-- ============================================================================

-- users
create unique index if not exists users_username_lower_key on public.users (lower(username));
create        index if not exists idx_users_email          on public.users (email);
create        index if not exists idx_users_username       on public.users (username);
create        index if not exists idx_users_created_at     on public.users (created_at);
create        index if not exists idx_users_last_login     on public.users (last_login);

-- problems
create index if not exists idx_problems_name on public.problems (name);

-- contests
create index if not exists idx_contests_name on public.contests (name);

-- contest_problems
create index if not exists idx_contest_problems_problem_id on public.contest_problems (problem_id);

-- contest_participants
create index if not exists idx_cp_contest    on public.contest_participants (contest_id);
create index if not exists idx_cp_user       on public.contest_participants (user_id);
create index if not exists idx_cp_joined_at  on public.contest_participants (joined_at);

-- submissions
create index if not exists idx_submissions_problem on public.submissions (problem_id);
create index if not exists idx_submissions_user    on public.submissions (user_id);
create index if not exists idx_submissions_created on public.submissions (created_at);

-- comments
create index if not exists idx_comments_problem_id on public.comments (problem_id, created_at desc);
create index if not exists idx_comments_user_id    on public.comments (user_id);
create index if not exists idx_comments_parent_id  on public.comments (parent_id);

-- comment_votes
create index if not exists idx_comment_votes_comment_id on public.comment_votes (comment_id);
create index if not exists idx_comment_votes_user_id    on public.comment_votes (user_id);


-- ============================================================================
-- 6. RLS policies (drop-then-create so the file is re-runnable)
-- ============================================================================

-- ----- public.users --------------------------------------------------------
drop policy if exists "users_select_all_public" on public.users;
create policy "users_select_all_public"
  on public.users for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  to public
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to public
  using (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.users;
create policy "Users can delete own profile"
  on public.users for delete
  to public
  using (auth.uid() = id);

drop policy if exists "managers_all_users" on public.users;
create policy "managers_all_users"
  on public.users for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.admins -------------------------------------------------------
drop policy if exists "Admins can view all admins" on public.admins;
create policy "Admins can view all admins"
  on public.admins for select
  to public
  using (is_admin());

drop policy if exists "managers_all_admins" on public.admins;
create policy "managers_all_admins"
  on public.admins for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.managers -----------------------------------------------------
drop policy if exists "managers_select_all" on public.managers;
create policy "managers_select_all"
  on public.managers for select
  to public
  using ((auth.uid() = id) or is_manager());

drop policy if exists "managers_update_own" on public.managers;
create policy "managers_update_own"
  on public.managers for update
  to public
  using (auth.uid() = id);

-- Active managers can promote/demote managers via the in-app flow on
-- /manager/usermanagement/[id]/. is_manager() is SECURITY DEFINER, which
-- avoids the RLS recursion that a raw EXISTS subquery would hit here.
drop policy if exists "managers_insert_managers" on public.managers;
create policy "managers_insert_managers"
  on public.managers for insert
  to authenticated
  with check (public.is_manager());

drop policy if exists "managers_delete_managers" on public.managers;
create policy "managers_delete_managers"
  on public.managers for delete
  to authenticated
  using (public.is_manager());

-- ----- public.problems -----------------------------------------------------
drop policy if exists "Allow all users to view problems" on public.problems;
create policy "Allow all users to view problems"
  on public.problems for select
  to public
  using (true);

drop policy if exists "Admins can insert own problems" on public.problems;
create policy "Admins can insert own problems"
  on public.problems for insert
  to authenticated
  with check (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and created_by = auth.uid()
    and is_active = false
  );

drop policy if exists "Admins can update own problems" on public.problems;
create policy "Admins can update own problems"
  on public.problems for update
  to authenticated
  using (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and created_by = auth.uid()
  )
  with check (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and created_by = auth.uid()
  );

drop policy if exists "Admins can delete own problems" on public.problems;
create policy "Admins can delete own problems"
  on public.problems for delete
  to authenticated
  using (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and created_by = auth.uid()
  );

drop policy if exists "managers_all_problems" on public.problems;
create policy "managers_all_problems"
  on public.problems for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.contests -----------------------------------------------------
drop policy if exists "Allow all users to view contests" on public.contests;
create policy "Allow all users to view contests"
  on public.contests for select
  to public
  using (true);

drop policy if exists "Admins can insert own contests" on public.contests;
create policy "Admins can insert own contests"
  on public.contests for insert
  to authenticated
  with check (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and created_by = auth.uid()
    and is_active = false
  );

drop policy if exists "Admins can update own contests" on public.contests;
create policy "Admins can update own contests"
  on public.contests for update
  to authenticated
  using (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and created_by = auth.uid()
  )
  with check (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and created_by = auth.uid()
  );

drop policy if exists "Admins can delete own contests" on public.contests;
create policy "Admins can delete own contests"
  on public.contests for delete
  to authenticated
  using (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and created_by = auth.uid()
  );

drop policy if exists "managers_all_contests" on public.contests;
create policy "managers_all_contests"
  on public.contests for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.contest_problems --------------------------------------------
drop policy if exists "Public can read contest_problems" on public.contest_problems;
create policy "Public can read contest_problems"
  on public.contest_problems for select
  to public
  using (true);

drop policy if exists "Admins can assign own problems to contests" on public.contest_problems;
create policy "Admins can assign own problems to contests"
  on public.contest_problems for insert
  to authenticated
  with check (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and exists (select 1 from public.problems where problems.id = contest_problems.problem_id and problems.created_by = auth.uid())
  );

drop policy if exists "Admins can remove own problems from contests" on public.contest_problems;
create policy "Admins can remove own problems from contests"
  on public.contest_problems for delete
  to authenticated
  using (
    exists (select 1 from public.admins where admins.id = auth.uid() and admins.is_active = true)
    and exists (select 1 from public.problems where problems.id = contest_problems.problem_id and problems.created_by = auth.uid())
  );

drop policy if exists "Managers can assign any problem to contests" on public.contest_problems;
create policy "Managers can assign any problem to contests"
  on public.contest_problems for insert
  to authenticated
  with check (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

drop policy if exists "Managers can remove any problem from contests" on public.contest_problems;
create policy "Managers can remove any problem from contests"
  on public.contest_problems for delete
  to authenticated
  using (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.contest_participants ----------------------------------------
drop policy if exists "read contest participants" on public.contest_participants;
create policy "read contest participants"
  on public.contest_participants for select
  to anon, authenticated
  using (true);

drop policy if exists "contest_participants_insert_own" on public.contest_participants;
create policy "contest_participants_insert_own"
  on public.contest_participants for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "cp_update_own" on public.contest_participants;
create policy "cp_update_own"
  on public.contest_participants for update
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "contest_participants_delete_own" on public.contest_participants;
create policy "contest_participants_delete_own"
  on public.contest_participants for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "managers_all_contest_participants" on public.contest_participants;
create policy "managers_all_contest_participants"
  on public.contest_participants for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.join_history ------------------------------------------------
drop policy if exists "Users can view all join history" on public.join_history;
create policy "Users can view all join history"
  on public.join_history for select
  to authenticated
  using (true);

drop policy if exists "Users can add their own join history" on public.join_history;
create policy "Users can add their own join history"
  on public.join_history for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "managers_all_join_history" on public.join_history;
create policy "managers_all_join_history"
  on public.join_history for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.countdown_timers --------------------------------------------
drop policy if exists "Users can view their own timers" on public.countdown_timers;
create policy "Users can view their own timers"
  on public.countdown_timers for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own timers" on public.countdown_timers;
create policy "Users can insert their own timers"
  on public.countdown_timers for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own timers" on public.countdown_timers;
create policy "Users can update their own timers"
  on public.countdown_timers for update
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own timers" on public.countdown_timers;
create policy "Users can delete their own timers"
  on public.countdown_timers for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "managers_all_countdown_timers" on public.countdown_timers;
create policy "managers_all_countdown_timers"
  on public.countdown_timers for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.submissions -------------------------------------------------
drop policy if exists "Allow everyone to view submissions" on public.submissions;
create policy "Allow everyone to view submissions"
  on public.submissions for select
  to anon, authenticated
  using (true);

-- Explicit ownership-scoped read guarantee: a signed-in user can ALWAYS view
-- their own submissions (including the `code` column), which backs the
-- user-facing "view my submission code" feature. RLS is row-level, so a matching
-- row exposes all of its columns. This policy is evaluated independently of (and
-- OR'd with) the broad public-read policy above, so users retain access to their
-- own code even if that broad policy is ever tightened.
drop policy if exists "Users can view their own submissions" on public.submissions;
create policy "Users can view their own submissions"
  on public.submissions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Allow insert for authenticated" on public.submissions;
create policy "Allow insert for authenticated"
  on public.submissions for insert
  to public
  with check (true);

drop policy if exists "managers_all_submissions" on public.submissions;
create policy "managers_all_submissions"
  on public.submissions for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));

-- ----- public.comments ----------------------------------------------------
drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all"
  on public.comments for select
  to anon, authenticated
  using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "managers_delete_comments" on public.comments;
create policy "managers_delete_comments"
  on public.comments for delete
  to authenticated
  using (exists (select 1 from public.managers where managers.id = auth.uid()));

-- ----- public.comment_votes -----------------------------------------------
drop policy if exists "comment_votes_select_all" on public.comment_votes;
create policy "comment_votes_select_all"
  on public.comment_votes for select
  to anon, authenticated
  using (true);

drop policy if exists "comment_votes_insert_own" on public.comment_votes;
create policy "comment_votes_insert_own"
  on public.comment_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "comment_votes_update_own" on public.comment_votes;
create policy "comment_votes_update_own"
  on public.comment_votes for update
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "comment_votes_delete_own" on public.comment_votes;
create policy "comment_votes_delete_own"
  on public.comment_votes for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "managers_all_comment_votes" on public.comment_votes;
create policy "managers_all_comment_votes"
  on public.comment_votes for all
  to authenticated
  using (exists (select 1 from public.managers where managers.id = auth.uid()));

-- ----- public.news_posts --------------------------------------------------
drop policy if exists "Everyone can view news posts" on public.news_posts;
create policy "Everyone can view news posts"
  on public.news_posts for select
  to public
  using (true);

drop policy if exists "Managers have all access to news posts" on public.news_posts;
create policy "Managers have all access to news posts"
  on public.news_posts for all
  to authenticated
  using     (exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true))
  with check(exists (select 1 from public.managers where managers.id = auth.uid() and managers.is_active = true));


-- ============================================================================
-- 7. RPC functions (called from the app via supabase.rpc(...))
-- ============================================================================

-- Returns true if the given email already exists in auth.users (case-insensitive).
-- Used by the signup form to give a faster "email is taken" hint than waiting
-- for auth.signUp to fail.
create or replace function public.is_email_registered(p_email text)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$;

-- Returns true if the given username (case-insensitive) is already taken.
create or replace function public.is_username_taken(p_username text)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where lower(username) = lower(trim(p_username))
  );
$$;

-- Recompute the public.users.problems_solved counter for the given user as
-- the count of distinct problem_ids the user has a 'passed' submission for.
create or replace function public.recalculate_problems_solved(uid uuid)
returns integer
language plpgsql
security definer
as $$
declare
  n integer := 0;
begin
  select count(distinct s.problem_id) into n
  from public.submissions s
  where s.user_id = uid
    and s.status = 'passed';

  update public.users set problems_solved = n where id = uid;

  return n;
end;
$$;

-- Recompute the public.users.points score for the given user. Sum of points
-- across the user's distinct passed problems, weighted by 0.95^rank (top 100),
-- plus a saturating completion bonus of 150 * (1 - 0.997^solved).
create or replace function public.recalculate_user_points(uid uuid)
returns double precision
language plpgsql
security definer
as $$
declare
  total    double precision := 0;
  bonus    double precision := 0;
  n_solved integer := 0;
  rec      record;
  i        integer := 0;
begin
  for rec in
    select sub.problem_points from (
      select distinct on (s.problem_id) p.points as problem_points
      from public.submissions s
      join public.problems p on p.id = s.problem_id
      where s.user_id = uid
        and s.status = 'passed'
      order by s.problem_id
    ) sub
    order by sub.problem_points desc
    limit 100
  loop
    total := total + rec.problem_points * power(0.95, i);
    i := i + 1;
  end loop;

  select count(distinct s.problem_id) into n_solved
  from public.submissions s
  where s.user_id = uid
    and s.status = 'passed';

  bonus := 150.0 * (1.0 - power(0.997, n_solved));

  update public.users set points = total + bonus where id = uid;

  return total + bonus;
end;
$$;

-- NOTE: The two functions below (join_contest, leave_contest, insert_problem,
-- and the second is_admin overload) exist in the production database but are
-- NOT called from the wmoj-app codebase. They are preserved here for parity
-- with prod so dumps round-trip cleanly. Safe to remove if you don't need them.

create or replace function public.is_admin(user_uuid uuid)
returns boolean
language plpgsql
security definer
as $$
begin
    return exists (
        select 1 from public.admins
        where user_id = user_uuid
    );
end;
$$;

create or replace function public.join_contest(p_contest_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public', 'auth'
as $$
declare
  v_user uuid := auth.uid();
  v_len_minutes int;
  v_exists int;
  v_other_active int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select length into v_len_minutes
  from contests
  where id = p_contest_id::text
  limit 1;

  if v_len_minutes is null then
    raise exception 'Contest not found';
  end if;

  select 1 into v_exists
  from contest_participants
  where contest_id = p_contest_id::text and user_id = v_user
  limit 1;

  if v_exists = 1 then
    return;
  end if;

  select 1 into v_other_active
  from contest_participants cp
  join contests c on c.id = cp.contest_id
  where cp.user_id = v_user
    and cp.contest_id <> p_contest_id::text
    and now() < (cp.joined_at + make_interval(mins => c.length))
  limit 1;

  if v_other_active = 1 then
    raise exception 'You are already in another active contest';
  end if;

  insert into contest_participants (contest_id, user_id, joined_at)
  values (p_contest_id::text, v_user, now())
  on conflict (contest_id, user_id) do nothing;
end;
$$;

create or replace function public.leave_contest(p_contest_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public', 'auth'
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  delete from contest_participants
  where contest_id = p_contest_id::text and user_id = v_user;
end;
$$;

create or replace function public.insert_problem(
  p_name text,
  p_content text,
  p_input jsonb,
  p_output jsonb,
  p_time_limit integer,
  p_memory_limit integer,
  p_difficulty text
)
returns uuid
language plpgsql
as $$
declare
    v_id uuid;
begin
    -- TODO: this prod function references a `difficulty` column that does
    -- not exist on public.problems in the current schema. It is preserved
    -- here for prod parity but will fail at runtime until the column is
    -- added or this function is removed.
    insert into public.problems (name, content, input, output, time_limit, memory_limit, difficulty)
    values (p_name, p_content, p_input, p_output, p_time_limit, p_memory_limit, p_difficulty)
    returning id into v_id;
    return v_id;
end;
$$;


-- ============================================================================
-- 8. Triggers
-- ============================================================================

-- Bump comment.score whenever votes change.
drop trigger if exists trigger_update_comment_score on public.comment_votes;
create trigger trigger_update_comment_score
  after insert or update or delete on public.comment_votes
  for each row execute function public.update_comment_score();

-- Bump news_posts.updated_at on every update.
drop trigger if exists news_posts_updated_at on public.news_posts;
create trigger news_posts_updated_at
  before update on public.news_posts
  for each row execute function public.set_news_posts_updated_at();


-- ============================================================================
-- 9. Storage (buckets + storage.objects RLS policies)
-- ============================================================================

-- ---- buckets --------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',        'avatars',        true, 52428800, array['image/*']::text[]),
  ('problem_images', 'problem_images', true,  5242880, array['image/png','image/jpeg','image/gif','image/webp']::text[])
on conflict (id) do nothing;

-- ---- storage.objects policies --------------------------------------------
-- Avatars bucket: per-user folder, public read, owner-only write.
drop policy if exists "Public read access for avatars" on storage.objects;
create policy "Public read access for avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

-- Problem images bucket: public read, any authenticated user can upload/delete
-- (additional admin/manager checks are enforced in the API route handler).
drop policy if exists "Public read problem_images" on storage.objects;
create policy "Public read problem_images"
  on storage.objects for select
  to public
  using (bucket_id = 'problem_images');

drop policy if exists "Authenticated upload problem_images" on storage.objects;
create policy "Authenticated upload problem_images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'problem_images');

drop policy if exists "Authenticated delete problem_images" on storage.objects;
create policy "Authenticated delete problem_images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'problem_images');


-- ============================================================================
-- End of schema.sql
-- ============================================================================
