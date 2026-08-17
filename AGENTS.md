# wmoj-app — agent guide

WMOJ (White Oaks Modern Online Judge), a competitive-programming platform run by the White Oaks
Secondary School CS Club. This repo is the web app + backend-for-frontend: **Next.js 16 (App
Router) + React 19 + Tailwind v4 on Supabase**, deployed to Vercel.

Code execution and grading live in a separate repo/service, **`wmoj-judge`**, called over HTTP.

## The app is `main/`, not the repo root

```
wmoj-app/          ← repo root. NOT the Next.js project.
├── .claude/
│   └── skills/    ← agent skills; `add-problem` publishes problems end-to-end
├── supabase/
│   └── migrations/ ← DB history; the first file is the full baseline schema
├── package.json   ← Vercel shim; exists only to ship @vercel/analytics
└── main/          ← the Next.js app. Run every npm command from here.
    ├── .env.local
    └── src/       ← `@/*` → `main/src/*`
```

**Adding problems?** Use the `add-problem` skill — it covers the statement format, extracting and
hosting statement figures, the `generator.cpp` house style, the live-judge verification loop, and the
direct database insert.

## Commands

```bash
cd main
npm install
npm run dev      # next dev --turbopack → :3000
npm run build    # next build --turbopack
npm run lint     # eslint — 74 pre-existing problems; leave files you touch clean
```

**No tests, no CI.** Don't invent `npm test`; verify by running the app. Next 16 doesn't run ESLint
during `build`, so lint breakage is invisible unless you run it. `main/eslint.config.mjs` imports
`eslint-config-next`'s flat configs directly; the old `FlatCompat` bridge threw `Converting circular
structure to JSON` against the locked v16 and made `npm run lint` unrunnable — don't reintroduce it.
Its 74 problems (50 errors, 24 warnings) are mostly `@typescript-eslint/no-explicit-any`.

## Architecture

- **Server/client split**: every route is a server `page.tsx` (auth + data fetching) rendering a
  sibling `'use client'` `<Thing>Client.tsx`. Most also have a `loading.tsx`. Follow this.
- **Three Supabase clients** in `src/lib/`: `supabase.ts` (browser), and `supabaseServer.ts` →
  `getServerSupabase()` (cookies) / `getServerSupabaseFromToken()` (Bearer).
- **No service-role client, no `middleware.ts`** — both deliberate. Auth = SSR checks in `page.tsx`
  + `lib/adminAuth.ts`/`lib/managerAuth.ts` in API routes + **RLS as the real boundary**.
- State: `AuthContext`, `CountdownContext`, `ThemeContext`. No Redux. SWR in two components only.
- Queries are inline and untyped (no DAL, no generated Supabase types).
- **Pagination (server-driven).** Every list route paginates server-side: `page.tsx` reads `?page=`
  via `parsePage`, queries with `.range(computeRange(...))` and `{ count: 'exact' }`, computes
  `totalPages` via `computeTotalPages`, clamps out-of-range pages via `clampPage` + `redirect`, and
  passes the page's rows + `currentPage` + `totalPages` to its client. The client uses
  `usePaginatedNavigation` (optimistic page via `useOptimistic` + `useTransition`-driven `isLoading`)
  + `<Pagination onPageChange displayPage loading>` + `<DataTable loading skeletonRowCount>`.
  Filter/search changes go through `handleFilterChange` (instant URL update, page reset to 1, same
  skeleton) or `useDebouncedSearch` (300ms debounce for text inputs). Enrichment (usernames, problem
  names, contest names) is **per-page**: collect IDs from the page's rows, batch-fetch related names
  via `.in('id', pageIds)` — never fetch enrichments for all rows. Shared infra lives in
  `lib/pagination.ts`, `hooks/usePaginatedNavigation.ts`, `hooks/useDebouncedSearch.ts`,
  `hooks/useViewCode.ts`, and `components/TableBodySkeleton.tsx`. `ClientPagination` was deleted
  (was `DataTable`'s old client-side paginator; zero callers after the migration).

**Roles: manager > admin > regular.** Admin-created problems and contests land *pending*
(`is_active = false`); manager-created contests go live immediately. Only managers flip `is_active`,
manage users, or edit an already-activated contest.

## Database

Live Supabase project **`WMOJ`** (ref `usltyqkrptaaktnmjeyf`, us-east-2, Postgres 17). Inspect it
with the Supabase MCP (`list_tables`, `execute_sql`).

13 tables, RLS enabled on all: `users`, `admins`, `managers`, `problems`, `contests`,
`contest_problems`, `contest_participants`, `join_history`, `countdown_timers`, `submissions`,
`comments`, `comment_votes`, `news_posts`.

Three public storage buckets: `avatars`, **`problem_images`** (statement figures, 5 MB/object,
raster only), and `goyslop`. The MCP has no storage tool — object bytes aren't in Postgres — so
uploads go over the storage REST API, and the project's `sb_secret_…` key is not a JWT: it belongs in
an `apikey` header, not `Authorization: Bearer`. The skill's `scripts/upload-image.sh` handles both.

### Every schema change must be a new migration file

`supabase/migrations/` is the traceable history of this database; the first file,
`20260814152742_initial_schema.sql`, is the full baseline (formerly the repo-root `schema.sql`).

**If you change anything in Supabase that alters its structure or behaviour — no matter how small —
you must record it as a NEW migration file there.** That covers `create`/`alter`/`drop` on tables,
columns, constraints, or indexes; any RLS policy; any function, trigger, RPC, or enum; extensions;
and storage buckets or their policies — whether you went through the Supabase MCP, the dashboard, or
the SQL editor. Read-only work (selects, data inspection, `explain`) needs no migration.

**Changing rows is not a migration.** Adding, editing, or removing the *data* the tables hold gets
**no file in `supabase/migrations/`**, however many rows it touches and even though it went through
the Supabase MCP: publishing a problem (see the `add-problem` skill), editing a statement, test
data, or a checker, flipping `is_active`, creating/activating/deleting contests and their
`contest_problems` / `contest_participants` rows, creating users, granting or revoking
`admins`/`managers`, recalculating points, and anything comparable in `news_posts`, `comments`,
`submissions`, or `countdown_timers`. The schema, policies, and functions are identical before and
after, so there is nothing to reverse or trace, and logging content edits here would bury the
structural changes this directory exists for.

The test is simply whether the *shape* changed. If publishing content ever seems to require a
column, a policy, or a function that does not exist yet, that part is a real schema change and does
need its own migration — the content edit still does not.

Rules:

- **Never edit an existing migration**, including the baseline — history stays append-only so changes
  remain traceable and reversible. Correct a mistake with a new migration on top.
- Name files `YYYYMMDDHHMMSS_short_snake_case_description.sql` (e.g.
  `20260901093000_add_problem_difficulty.sql`), using the real current timestamp so ordering holds.
- One logical change per file, opening with a comment saying what it does and why. Make it idempotent
  where practical (`if not exists`, `or replace`, `drop ... if exists`), matching the baseline's
  style, and include the matching rollback as a commented-out block when the change is destructive.
- Apply the SQL to the live project **and** commit the migration file in the same change — never one
  without the other, or the history silently drifts from reality.

### Easy to get wrong

- **`problems` has NO `contest` column.** The relationship is the `contest_problems` junction.
  `api/admin/problems/[id]/route.ts` and `api/manager/problems/[id]/route.ts` still select it, so
  **both GETs 500 unconditionally**; they're superseded by server components. Don't copy that.
- **`problems.checker`** is nullable `text` holding optional C++ checker source; `NULL`/empty means
  byte comparison, which is what all but a handful of live problems use.
- **Statement figures are raw `<img>` in the Markdown**, and `MarkdownRenderer`'s `rehype-sanitize`
  schema keeps only `src`, `alt`, and `size` (a width *percentage*). `width`, `style`, and `class`
  are dropped silently. `utils/problemImages.ts` scrapes those `src`s so the admin/manager DELETE
  routes can clear the bucket — an image's lifetime is tied to the statement referencing it.
- **`submissions.status` is GENERATED STORED** from `summary->>'failed'`/`'total'`. Never write it.
- **`submissions.problem_id`/`user_id` have no FKs.** Orphans are possible.
- **Contest status is never stored** — always compute with `getContestStatus()`. Both timestamps
  null means `virtual`, not `inactive`.
- **Compile errors are stuffed into the `summary` JSON** as `{verdict:'CE', compileError}`; there is
  no `verdict` column.
- `problems.time_limit` is **ms**; `memory_limit` is **MB**.
- Scoring lives in SQL RPCs `recalculate_problems_solved(uid)` / `recalculate_user_points(uid)`
  (top-100 problems, `points * 0.95^i`, plus a `150*(1-0.997^n)` bonus). The `/pointsystem` page
  mirrors the formula — change both together.
- RLS is broadly permissive: `submissions` (**including `code`**), `users` (including `email`), and
  `problems` (including test data, regardless of `is_active`) are all world-readable. Know this
  before widening anything.

## Judge integration

Four **server-side-only** call sites, each a single synchronous `fetch` — no retries, no timeout, no
queue. The browser's submit blocks until every test case has run. Auth header is **`X-Judge-Token`**
(not `Authorization`), matching the judge's `JUDGE_SHARED_SECRET`.

| App route | Judge endpoint |
|---|---|
| `api/problems/[id]/submit` | `POST /submit` |
| `api/{admin,manager}/problems/generator/generate` | `POST /generate-tests` |
| `api/status/health` | `GET /health` |

`POST /submit` sends `{language, code, input, output, timeLimit, memoryLimit, checker?}`
(`input`/`output` are the problem's equal-length jsonb arrays) and returns
`{summary:{total,passed,failed}, results[], effectiveMemoryLimitMb, compileError?, checkerError?}`.

**A compile error is HTTP 200**, with `summary = {0,0,0}`, `results = []`, and `compileError`. Branch
on `compileError` before reading `summary`. A 4xx/5xx means the request or the judge is wrong, never
the user's code. The judge never emits `CE` — this app synthesizes it.

**Custom checkers.** For problems whose answer isn't unique, `problems.checker` holds C++ source and
the route sends `checker` **only when non-empty**, so a no-checker problem's payload is unchanged and
still graded byte-for-byte. The judge compiles it once per submission, runs it per case as
`checker <input> <expected> <contestant_output>` (testlib exit codes: `0` accept, `1` WA, `2` PE →
graded WA, `3` checker internal error ⇒ the problem's own data is broken), and returns its stderr as
`results[].checkerMessage`, shown to the student. **A checker that fails to compile is HTTP 200 with
`checkerError`** — a *problem-configuration* fault, not the student's: branch on it **before**
`compileError` and store no submission row, so it can never surface as someone's compile error.

`NEXT_PUBLIC_JUDGE_URL` carries the public prefix but is only read server-side; the browser must not
learn the judge URL (hence `/status` proxying through `api/status/health`). Never add
`NEXT_PUBLIC_` to `JUDGE_SHARED_SECRET`, and never import `lib/env.ts` from a client component.

## Test-case budget — read before authoring problems

The judge runs on a **free Render instance: 512 MB RAM, ~0.1 CPU**, in a limited container, running
cases serially. Problems are sized for that host, so WMOJ deliberately ships **far fewer and smaller
test cases than other sites hosting the same problems** — cover the core edge cases, not everything.

Hard caps enforced by the judge (`src/middleware/requestCaps.ts`, 413 on violation): **200 cases**
per problem, **1 MB** per single input, **1 MB** per single expected output, 100 KB of submitted
source, 100 KB of checker source. What the 74 live problems look like — copy the CCC cohort, which
was authored against these caps:

| | Cases (min–max, avg) | Largest single case | Largest total in+out |
|---|---|---|---|
| CCC 2021–26, via the skill (50) | 15–55, ~25 | 122 KB | 597 KB |
| Legacy (24) | 8–65, ~35 | 1,477,908 B | 3.0 MB |

Two legacy problems exceed the 1 MB per-case cap and are **permanently unsubmittable** (413 before
anything compiles), which is why both have zero submissions: `WOSS TriOlympiad: S2` (1,477,908 B)
and `WOSS TriOlympiad: J3` (1,001,009 B, over by ~1 KB). **24 legacy problems also have no
`generator_file`**, so their data can't be regenerated or audited; the skill always stores one.

**Memory limits.** A problem may declare its source contest's real limit, values above 512 included:
the judge enforces `min(declared, HOST_MEMORY_CEILING_MB)` (ceiling **512**) and reports
`effectiveMemoryLimitMb`. But when a problem is genuinely solvable in 512 MB or less — nearly always
— store 512 or lower rather than an inflated number. **256 is the sensible default**, and no live
problem currently exceeds 512.

Limits use `RLIMIT_AS`, which caps **virtual address space, not resident memory**, so hitting one
makes `malloc` fail instead of triggering a kill: the program exits non-zero with low RSS, which is
why older submissions can show `RE` where `MLE` was meant. The judge now also derives MLE from
RSS ≥ 98% of the limit and from allocation-failure signatures (`std::bad_alloc`, `MemoryError`, …),
in verdict order TLE → MLE → RE → WA/AC. A plain SIGSEGV with low RSS correctly stays `RE`.

**Never let two agents share the judge.** Concurrent jobs on this serial box corrupt each other's
verdicts — spurious TLE off the 3× wall-clock backstop, an OOM-killed `g++` reported as a compile
error. `.claude/skills/add-problem/scripts/judge-lock.sh` takes the same arguments as `judge.sh` and
serializes `generate`/`submit` (`health`/`check` pass through), at no cost in throughput.

## Invariants

1. **Submissions persist only for active problems.** Staff test-submissions against unpublished
   problems run and render but are never stored — the stat RPCs depend on this and carry no
   `is_active` filter.
2. **Points/solved recalculate only on a first solve** (or when a manager deletes a submission).
3. **Contest-problem eligibility**: a problem in a *rated* contest that is ongoing/upcoming can't be
   added elsewhere; a *rated* target contest accepts only problems not already in another contest.
4. **`checkTimerExpiry` fails closed** (any error ⇒ expired). `getTimerStatus` is *destructive*:
   reading an expired timer deletes the timer + participant rows and stamps `left_at`.
5. Contest leaderboards are **not point-weighted** — each problem contributes at most 1.0.
6. The generator staleness guard is deliberate: on create it blocks submit, on edit one state blocks
   and another only warns, so `generator_file` always matches the stored tests.

## Conventions & don'ts

- Tailwind v4 tokens (`bg-surface-2`, `text-text-muted`, `text-brand-primary`, `border-border`), not
  raw colors; `.glass-panel` for cards; `DataTable` for tables; `toast.*` for action feedback.
- Hidden resources return **404, not 403** (`canUserAccessProblem`/`canUserAccessContest`).
- Reuse `getAdminSupabase`/`getManagerSupabase` rather than re-inlining the Bearer/cookie preamble.
- **Don't make `AuthContext`'s `onAuthStateChange` callback async** — it deadlocks against Supabase's
  `_initialize()` and causes 30-second profile loads.
- **Don't add client-side role checks to `AdminGuard`/`ManagerGuard`** — they omit them on purpose;
  a stale token used to kick staff out on reload.
- **Don't assume dark mode works**: `ThemeContext` hard-codes light and `ThemeToggle` returns `null`.
- **Check for callers before "fixing" an API route** — ~16 are dead, several superseded by server
  components. Dead modules include `utils/userRole.ts`, `utils/participationCheck.ts`,
  `hooks/useAnimations.ts`, `components/landing/*`, and `components/layout/Sidebar.tsx`.
- **Don't re-introduce client-side pagination** for DB-backed lists. `DataTable`'s `pageSize` prop
  was removed; server-paginated routes pass one page of rows directly. If you need a client-side
  table for a small static list, re-add `pageSize` deliberately — but the default for any DB-backed
  list is server pagination.
- **Don't call `setRows(prev => ...)` after a delete/toggle.** Call `startTransition(() =>
  router.refresh())` to re-fetch the current page from the server. The server is the source of
  truth and handles the "last row on page deleted" case via `clampPage` + `redirect`.
- **Don't use `useSearchParams` in a client component** for filter state — derive from server props
  instead (avoids the Next 16 `<Suspense>` boundary requirement). `useDebouncedSearch` handles the
  debounced-URL-write side.
- **Don't select `code` or `results` in submission-list queries.** The submission-list routes
  (`/admin/dashboard`, `/manager/dashboard`, `/admin|manager/problems/[id]/submissions`,
  `/manager/usermanagement/[id]`) select only `id, created_at, language, status, summary, problem_id,
  user_id`. The "View Code" modal fetches `{ code, results }` on demand via
  `GET /api/{admin,manager}/submissions/[id]` (backed by `useViewCode`). Pulling `code` for every
  row in a 20-row page is the bug this migration fixed; don't reintroduce it.
- **Reuse `useViewCode`** for any submission-list "View Code" affordance. Don't hand-roll the
  fetch/state/modal triplet per route.

## Related repo

`wmoj-judge` has its own `AGENTS.md` covering the sandbox and the full API contract. Any change to
the `/submit` or `/generate-tests` shape is a **cross-repo breaking change** — coordinate both sides.

---

**Keeping this current:** if you notice anything here that is outdated, stale, wrong, or missing —
update it as part of your change. New commands, env vars, schema changes, a shifted convention, a
changed judge contract, or knowledge you had to discover the hard way all belong here. This file is
only useful while it is accurate; treat letting it go stale as leaving the work unfinished.
