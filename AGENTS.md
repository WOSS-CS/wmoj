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

**Adding problems?** Use the `add-problem` skill — it covers the statement format, the
`generator.cpp` house style, the live-judge verification loop, and the direct database insert.

## Commands

```bash
cd main
npm install
npm run dev      # next dev --turbopack → :3000
npm run build    # next build --turbopack
npm run lint     # eslint — has pre-existing `any` failures; leave files you touch clean
```

**No tests, no CI.** Don't invent `npm test`; verify by running the app. Next 16 doesn't run ESLint
during `build`, so lint breakage is invisible unless you run it.

## Architecture

- **Server/client split**: every route is a server `page.tsx` (auth + data fetching) rendering a
  sibling `'use client'` `<Thing>Client.tsx`. Most also have a `loading.tsx`. Follow this.
- **Three Supabase clients** in `src/lib/`: `supabase.ts` (browser), and `supabaseServer.ts` →
  `getServerSupabase()` (cookies) / `getServerSupabaseFromToken()` (Bearer).
- **No service-role client, no `middleware.ts`** — both deliberate. Auth = SSR checks in `page.tsx`
  + `lib/adminAuth.ts`/`lib/managerAuth.ts` in API routes + **RLS as the real boundary**.
- State: `AuthContext`, `CountdownContext`, `ThemeContext`. No Redux. SWR in two components only.
- Queries are inline and untyped (no DAL, no generated Supabase types).

**Roles: manager > admin > regular.** Admin-created problems and contests land *pending*
(`is_active = false`); manager-created contests go live immediately. Only managers flip `is_active`,
manage users, or edit an already-activated contest.

## Database

Live Supabase project **`WMOJ`** (ref `usltyqkrptaaktnmjeyf`, us-east-2, Postgres 17). Inspect it
with the Supabase MCP (`list_tables`, `execute_sql`).

13 tables, RLS enabled on all: `users`, `admins`, `managers`, `problems`, `contests`,
`contest_problems`, `contest_participants`, `join_history`, `countdown_timers`, `submissions`,
`comments`, `comment_votes`, `news_posts`.

### Every schema change must be a new migration file

`supabase/migrations/` is the traceable history of this database. The first file,
`20260814152742_initial_schema.sql`, is the full baseline (formerly the repo-root `schema.sql`).

**If you change anything in Supabase that alters its structure or behaviour — no matter how small —
you must record it as a NEW migration file in `supabase/migrations/`.** That covers `create`/`alter`
/`drop` on tables, columns, constraints, or indexes; any RLS policy change; any function, trigger,
RPC, or enum change; extensions; and storage bucket or storage-policy changes. It applies whether you
made the change through the Supabase MCP, the dashboard, or the SQL editor.

Read-only work needs no migration: selects, data inspection, and `explain`.

**Changing rows is not a migration.** Adding, editing, or removing the *data* the tables hold —
as opposed to the tables themselves — gets **no file in `supabase/migrations/`**, no matter how
many rows it touches or that it went through the Supabase MCP. That includes, and is not limited
to:

- **Problems** — publishing one (see the `add-problem` skill in `.claude/skills/`), editing a
  statement or test data, flipping `is_active`, deleting one.
- **Contests** — creating, editing, activating, or deleting them, and their `contest_problems` /
  `contest_participants` rows.
- **Users** — creating accounts, updating profile fields, granting or revoking `admins` /
  `managers`, recalculating points.
- Anything comparable in `news_posts`, `comments`, `submissions`, or `countdown_timers`.

None of that alters the database — only what is stored in it. The schema, the policies, and the
functions are identical before and after, so there is nothing to reverse or trace at the migration
level. Logging content edits here would bury the structural changes that genuinely need to be
traceable, which is the only thing this directory is for.

The test is simply whether the *shape* changed. If publishing content ever seems to require a
column, a policy, or a function that does not exist yet, that part is a real schema change and does
need its own migration — the content edit still does not.

Rules:

- **Never edit an existing migration**, including the baseline. History must stay append-only so
  changes remain traceable and reversible. Correct a mistake with a new migration on top.
- Name files `YYYYMMDDHHMMSS_short_snake_case_description.sql` — e.g.
  `20260901093000_add_problem_difficulty.sql`. Use the real current timestamp so ordering holds.
- One logical change per file. Open with a comment saying what it does and why.
- Make it idempotent where practical (`if not exists`, `or replace`, `drop ... if exists`), matching
  the baseline's style.
- Include the matching rollback as a commented-out block at the bottom when the change is
  destructive.
- Apply the SQL to the live project **and** commit the migration file in the same change — never one
  without the other, or the history silently drifts from reality.

### Easy to get wrong

- **`problems` has NO `contest` column.** The relationship is the `contest_problems` junction.
  Several existing routes query `problems.contest` and silently 500 — don't copy that.
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

`POST /submit` sends `{language, code, input, output, timeLimit, memoryLimit}` (`input`/`output` are
the problem's equal-length jsonb arrays) and returns
`{summary:{total,passed,failed}, results[], compileError?}`.

**A compile error is HTTP 200**, with `summary = {0,0,0}`, `results = []`, and `compileError`. Branch
on `compileError` before reading `summary`. A 4xx/5xx means the request or the judge is wrong, never
the user's code. The judge never emits `CE`/`IE` verdicts — this app synthesizes `CE` itself.

`NEXT_PUBLIC_JUDGE_URL` carries the public prefix but is only read server-side; the browser must not
learn the judge URL (hence `/status` proxying through `api/status/health`). Never add
`NEXT_PUBLIC_` to `JUDGE_SHARED_SECRET`, and never import `lib/env.ts` from a client component.

## Test-case budget — read before authoring problems

The judge runs on a **free Render instance: 512 MB RAM, ~0.1 CPU**, inside a container with limited
privileges. Problems must be sized for that host, so WMOJ deliberately ships **far fewer and smaller
test cases than other sites hosting the same problems**. Aim to cover the core edge cases well
rather than exhaustively.

Hard caps enforced by the judge (`src/middleware/requestCaps.ts`, 413 on violation):

| Limit | Value |
|---|---|
| Test cases per problem | **200** |
| Bytes per single input | **1 MB** |
| Bytes per single expected output | **1 MB** |
| Submitted source | 100 KB |

What the live data actually looks like (32 problems): **8–65 cases, averaging ~33**; most inputs are
tens of bytes to a few KB; the heaviest realistic cases peak around **50–120 KB each**. Total
input+output per problem stays under ~3 MB.

Two live problems already violate this and are **unsubmittable** — the judge 413s before running
anything, which is why both have zero submissions:

- `WOSS TriOlympiad: S2` — largest case 1,477,908 bytes
- `WOSS TriOlympiad: J3` — largest case 1,001,009 bytes (over by ~1 KB)

Also note **6 live problems declare `memory_limit = 1024` MB**, double the host's entire RAM, so
that limit can never actually be enforced. Prefer limits that fit inside 512 MB.

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

## Related repo

`wmoj-judge` has its own `AGENTS.md` covering the sandbox and the full API contract. Any change to
the `/submit` or `/generate-tests` shape is a **cross-repo breaking change** — coordinate both sides.

---

**Keeping this current:** if you notice anything here that is outdated, stale, wrong, or missing —
update it as part of your change. New commands, env vars, schema changes, a shifted convention, a
changed judge contract, or knowledge you had to discover the hard way all belong here. This file is
only useful while it is accurate; treat letting it go stale as leaving the work unfinished.
