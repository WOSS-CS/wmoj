-- Add the composite indexes the hot query paths actually need, and drop three that are pure
-- write-amplification.
--
-- The three drops are redundant, each verified against `pg_indexes` before removal:
--   * `idx_cp_contest` is `(contest_id)` while `contest_participants_pkey` is
--     `(contest_id, user_id)` — a leading-column prefix of an existing index serves every query the
--     standalone one would.
--   * `idx_users_email`    duplicates the UNIQUE index `users_email_key`.
--   * `idx_users_username` duplicates the UNIQUE index `users_username_key`.
-- Each cost an extra B-tree write per row insert/update and bought nothing.
--
-- The additions back the filters the paginated list pages and the scoring RPCs actually issue:
-- `is_active` + `created_at desc` ordering on the two catalogue tables, `created_by` for the
-- admin-scoped list queries, and the two `submissions` composites the first-solve check and the
-- per-user submission list depend on.

create index if not exists idx_problems_active_created  on public.problems   (is_active, created_at desc);
create index if not exists idx_contests_active_created  on public.contests   (is_active, created_at desc);
create index if not exists idx_problems_created_by      on public.problems   (created_by);
create index if not exists idx_contests_created_by      on public.contests   (created_by);
create index if not exists idx_join_history_contest     on public.join_history (contest_id, is_virtual);
create index if not exists idx_news_posts_date          on public.news_posts (date_posted desc);
create index if not exists idx_submissions_user_problem_status
  on public.submissions (user_id, problem_id, status);
create index if not exists idx_submissions_user_created on public.submissions (user_id, created_at desc);
create index if not exists idx_users_points             on public.users      (points desc);

drop index if exists public.idx_cp_contest;
drop index if exists public.idx_users_email;
drop index if exists public.idx_users_username;
