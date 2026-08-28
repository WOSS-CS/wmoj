-- Index maintenance on `public.users`, for the /users leaderboard.
--
-- `app/users/page.tsx` orders by `points DESC, id ASC` (or `problems_solved DESC, id ASC` under
-- ?sort=problems) and pages with LIMIT/OFFSET. The trailing `id` is an OFFSET-STABILITY tiebreak,
-- not keyset pagination: `points` is 0 for most users, and without a unique tiebreak Postgres gives
-- no stable order across separate LIMIT/OFFSET queries, so paging 2 -> 3 -> 2 can show one user
-- twice and omit another. The composite indexes below match that ordering exactly, so the sort is
-- satisfied by an index scan instead of a full sort on every page.
--
-- Both leading columns are NOT NULL DEFAULT 0, so NULLS FIRST/LAST never enters into it.
--
-- Plain `CREATE INDEX`, NOT `CONCURRENTLY`: a migration file runs in one transaction, and
-- CREATE INDEX CONCURRENTLY cannot run inside one. At 46 rows the lock is irrelevant anyway.

create index if not exists idx_users_points_id
  on public.users (points desc, id);

create index if not exists idx_users_problems_solved_id
  on public.users (problems_solved desc, id);

-- `idx_users_points` was `(points DESC)` — a strict PREFIX of `idx_users_points_id` above. Any scan
-- it could serve, the composite serves at least as well. Keeping both is pure write amplification
-- on a column the points RPCs rewrite on every first solve.
drop index if exists public.idx_users_points;

-- `idx_users_last_login` was the largest index on `users` (40 kB, larger than the table's primary
-- key) with ZERO scans since statistics were last reset. Nothing in `main/src` orders by, filters
-- on, or joins `last_login` — the column is written on every sign-in and never read back. An index
-- that is only ever written is a pure cost.
drop index if exists public.idx_users_last_login;
