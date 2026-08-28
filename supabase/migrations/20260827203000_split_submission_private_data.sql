-- Split the private half of a submission off the world-readable `public.submissions` table,
-- then REDACT what remains.
--
-- Why: `submissions`' SELECT policy `Allow everyone to view submissions` is `using (true)` granted
-- to {anon, authenticated}, and `anon` holds column SELECT on all eleven columns. RLS filters ROWS,
-- not COLUMNS. So with nothing but the publishable key — which ships in the browser bundle by
-- design — any visitor could read:
--
--   * `code`   — every student's source, for every problem, verbatim; and
--   * `results` — 3,457 per-case elements, EVERY ONE carrying a non-empty `expected`. Those dedupe
--                 to 489 distinct (problem, expected) pairs across 19 of the 80 active problems.
--                 That is the answer key, republished one test case at a time. `20260826213600`
--                 moved the answer key off `problems`; it was still readable from here.
--
-- Why a side table rather than tightening privileges: column GRANTs are per-ROLE, and the owner and
-- a stranger are both `authenticated`. "Everyone may see the row, only the owner may see its `code`"
-- is not expressible on one table. Revoking `code` from `authenticated` would break the owner's own
-- "view my submission" route, which reads it through the CALLER'S token, not the service role. This
-- is the same side-table pattern `20260826213600` used for `public.problem_tests` — direct
-- precedent, including that `input`/`output` were previously moved off a world-readable table.
--
-- ORDER MATTERS, and the whole file is one transaction: create -> grant/revoke -> policy ->
-- backfill -> VERIFY -> redact -> drop. The verification step is what makes the drops safe.

-- ---------------------------------------------------------------------------------------------
-- 1. The side table.
-- ---------------------------------------------------------------------------------------------

create table if not exists public.submission_private (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  user_id       uuid not null,
  code          text,
  results_full  jsonb,
  compile_error text,
  created_at    timestamptz not null
);

comment on table public.submission_private is
  'The private half of a submission: source code, the FULL per-case judge output (including '
  '`expected`, `received`, `stdout`, `stderr`) and compiler diagnostics. Readable only by the '
  'submitting user and by active staff. The public `public.submissions` row keeps a redacted '
  '`results` array. Written by the service role only.';

-- `submissions.user_id` has no FK to `users`, so this column deliberately has none either — it
-- mirrors the parent row rather than inventing a constraint the parent does not carry.
create index if not exists idx_submission_private_user_id
  on public.submission_private (user_id);

-- ---------------------------------------------------------------------------------------------
-- 2. Grants — stated explicitly, never left to omission.
-- ---------------------------------------------------------------------------------------------
-- `pg_default_acl` for schema `public` on this project grants anon, authenticated and service_role
-- ALL (arwdDxtm) on every newly created table. So a table created with no GRANT statement is NOT
-- inaccessible — it is world-writable. `problem_tests` has zero anon grants only because its
-- migration revoked them explicitly. Do the same here.
--
-- TRUNCATE in particular is NOT subject to RLS: without this revoke, `anon` could empty the table
-- outright even though every policy below denies reads.

alter table public.submission_private enable row level security;

revoke all on public.submission_private from anon;
revoke all on public.submission_private from authenticated;
grant select on public.submission_private to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. The one policy. SELECT only.
-- ---------------------------------------------------------------------------------------------
-- No INSERT/UPDATE/DELETE policy, by design: every write goes through the service-role client
-- (`main/src/lib/supabaseAdmin.ts`). Deletes are handled by the FK's ON DELETE CASCADE above, which
-- runs as the table owner and is not subject to the deleter's RLS — so the manager submission-delete
-- route must NOT try to remove the private row itself.

drop policy if exists "submission_private_select_own_or_staff" on public.submission_private;
create policy "submission_private_select_own_or_staff" on public.submission_private
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin() or public.is_manager());

-- ---------------------------------------------------------------------------------------------
-- 4. Backfill.
-- ---------------------------------------------------------------------------------------------
-- Carry the ORIGINAL `submissions.created_at`; defaulting to migration time would silently restamp
-- every historical submission. `coalesce` only because the parent column is nullable.

insert into public.submission_private (submission_id, user_id, code, results_full, compile_error, created_at)
select s.id,
       s.user_id,
       s.code,
       s.results,
       nullif(s.summary ->> 'compileError', ''),
       coalesce(s.created_at, now())
from public.submissions s
on conflict (submission_id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- 5. VERIFY before destroying anything.
-- ---------------------------------------------------------------------------------------------
-- Count EQUALITY, not `> 0`. A `> 0` guard would abort the required from-empty `supabase db reset`
-- replay, where both counts are legitimately zero.

do $$
declare
  n_private bigint;
  n_public  bigint;
begin
  select count(*) into n_private from public.submission_private;
  select count(*) into n_public  from public.submissions;
  if n_private <> n_public then
    raise exception
      'submission_private backfill incomplete: % private rows vs % submissions. Refusing to drop columns.',
      n_private, n_public;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 6. Redact `submissions.results` in place — with an ALLOWLIST.
-- ---------------------------------------------------------------------------------------------
-- Keep exactly: verdict, passed, index, timedOut, exitCode. Drop everything else.
--
-- ALLOWLIST, NOT DENYLIST, and this is load-bearing. Every element stored TODAY carries exactly
-- nine keys, so a denylist of the four private ones would look equivalent. It is not: the CURRENT
-- judge (`wmoj-judge/src/types.ts`) already emits `timeMs`, `cpuMs`, `memKb`, `truncated` and
-- `checkerMessage` — and `checkerMessage` is checker stderr, which routinely quotes the expected
-- output ("expected '42', found '17'"). A denylist would republish the answer key publicly on the
-- very next submission. An allowlist fails closed against every future field.
--
-- Array ORDER and ELEMENT COUNT are preserved so `index` stays meaningful: `with ordinality` plus
-- an ordered `jsonb_agg`.

update public.submissions s
set results = r.redacted
from (
  select s2.id,
         coalesce(
           (
             select jsonb_agg(
                      case
                        when jsonb_typeof(e.value) = 'object' then
                          coalesce(
                            (
                              select jsonb_object_agg(k, e.value -> k)
                              from jsonb_object_keys(e.value) as k
                              where k in ('verdict', 'passed', 'index', 'timedOut', 'exitCode')
                            ),
                            '{}'::jsonb
                          )
                        else '{}'::jsonb
                      end
                      order by e.ordinality
                    )
             from jsonb_array_elements(s2.results) with ordinality as e(value, ordinality)
           ),
           '[]'::jsonb
         ) as redacted
  from public.submissions s2
  where s2.results is not null
    and jsonb_typeof(s2.results) = 'array'
) r
where s.id = r.id;

-- ---------------------------------------------------------------------------------------------
-- 7. Strip `compileError` from the public `summary`.
-- ---------------------------------------------------------------------------------------------
-- Compiler diagnostics quote source lines, so they are the student's code by another route. The
-- `verdict: 'CE'` marker stays public — the `/submissions` CE filter keys off `summary->>'total'`,
-- not the message text. Zero rows carry it today; this is future-proofing on a path the application
-- change lands alongside.

update public.submissions
set summary = summary - 'compileError'
where summary ? 'compileError';

-- ---------------------------------------------------------------------------------------------
-- 8. Drop the leaked columns.
-- ---------------------------------------------------------------------------------------------
-- Verified first-hand: nothing depends on these three but their own column defaults. There are no
-- views in schema `public` at all, no triggers on `submissions`, and its only constraints are the
-- primary key and the `language` CHECK.
--
-- `code` and the full `results` survive in `submission_private` above. `input`/`output` are the only
-- data destroyed by design: they are a verbatim per-submission copy of the problem's ENTIRE test set
-- (7.7 MB on disk across 82 rows, ~98% of every row's payload), nothing has ever read them back, and
-- the write path stopped populating them before any row in production was written.

alter table public.submissions drop column code;
alter table public.submissions drop column input;
alter table public.submissions drop column output;

-- ---------------------------------------------------------------------------------------------
-- 9. Re-assert the surviving `submissions` grant set explicitly.
-- ---------------------------------------------------------------------------------------------
-- `anon` held INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER here purely from the default
-- ACL. INSERT/UPDATE/DELETE are unexploitable over PostgREST today (no anon write policy exists),
-- but TRUNCATE is not RLS-subject. `anon` needs exactly one privilege: SELECT. Say so, rather than
-- leaving the answer to a default nobody reads.

revoke all on public.submissions from anon;
grant select on public.submissions to anon;

-- ---------------------------------------------------------------------------------------------
-- 10. Drop the strictly-subsumed SELECT policy.
-- ---------------------------------------------------------------------------------------------
-- `Users can view their own submissions` is PERMISSIVE, FOR SELECT, TO authenticated,
-- USING (auth.uid() = user_id). `Allow everyone to view submissions` is PERMISSIVE, FOR SELECT,
-- TO {anon, authenticated}, USING (true). Permissive policies OR together, so the second strictly
-- subsumes the first on every axis: same command, superset of roles, superset of rows. It grants
-- nothing and only reads as if ownership were enforced here, which it is not. Ownership now lives
-- on `submission_private`, where it is real.

drop policy if exists "Users can view their own submissions" on public.submissions;

-- ---------------------------------------------------------------------------------------------
-- 11. `users.email` — the same structural defect, on PII.
-- ---------------------------------------------------------------------------------------------
-- `users_select_all_public` is `using (true)` to {anon, authenticated} and `anon` held table-level
-- SELECT, so all 46 email addresses were anonymously readable. On a high-school club site the
-- subjects are likely minors.
--
-- Postgres cannot subtract one column from a table-level grant: `revoke select (email)` against a
-- table-level SELECT is a no-op. The grant must be re-issued column-wise.
--
-- Audited alongside it, as the plan required:
--   * `last_login`   — no reader anywhere in `main/src` (`types/user.ts` declares it; nothing reads
--                      it). Activity metadata. Revoked from anon.
--   * `profile_data` — no reader anywhere in `main/src`, and empty ('{}') on all 46 rows. Revoked.
--
-- Every remaining column is one an anonymous visitor legitimately sees on /users, /users/[username],
-- /submissions or a contest leaderboard. `is_active` is granted because the CURRENTLY DEPLOYED build
-- still filters on it; the next migration drops the column and takes this grant with it.
--
-- Verified before revoking: every reader of `users.email` is server-side AND staff-guarded
-- (`admin/dashboard`, `admin/problems/[id]/submissions`, `manager/dashboard`,
-- `manager/problems/[id]/submissions`, `manager/usermanagement`, `manager/usermanagement/[id]`),
-- all running as an authenticated manager/admin, which keeps the grant. The ONE anon-reachable
-- reader — `app/contests/[id]/leaderboard/page.tsx`, which used `email.split('@')[0]` as a username
-- fallback that could never fire because `users.username` is NOT NULL — is repaired in the same
-- change.

revoke select on public.users from anon;
grant select (
  id,
  username,
  created_at,
  updated_at,
  is_active,
  problems_solved,
  about_me,
  points
) on public.users to anon;
