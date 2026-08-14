# wmoj-app — agent guide

WMOJ (White Oaks Modern Online Judge) — a competitive-programming judge platform built and run by
the White Oaks Secondary School CS Club. This repo is the **web app + backend-for-frontend**:
Next.js 16 (App Router) on Supabase, deployed to Vercel.

Code execution and grading live in a **separate repo and service**, `wmoj-judge`, which this app
calls over HTTP. See [Judge integration](#judge-integration).

---

## Read this first: the app is `main/`, not the repo root

```
wmoj-app/                 ← repo root. NOT the Next.js project.
├── schema.sql            ← the database contract (source of truth, 1000+ lines)
├── package.json          ← Vercel shim: exists only to ship @vercel/analytics
├── README.md             ← self-hosting / setup guide
└── main/                 ← the actual Next.js app. Run every npm command from here.
    └── src/              ← `@/*` resolves to `main/src/*`
```

Vercel is pointed at `main/`. If you `npm run dev` from the repo root, nothing works.

---

## Commands

All from `main/`:

```bash
cd main
npm install
npm run dev      # next dev --turbopack  → http://localhost:3000
npm run build    # next build --turbopack
npm run start
npm run lint     # eslint
```

**There are no tests, no test framework, and no CI in this repo.** Do not invent `npm test`.
Verify changes by running the app.

`npm run lint` has pre-existing failures (bare `any` in ~12 files, plus at least one unused
binding). Next 16 does not run ESLint during `next build`, so lint breakage is invisible until you
run it explicitly. If you touch a file, leave it lint-clean; fixing the whole backlog is a separate
piece of work.

Database changes are **manual** — there is no `supabase/migrations/` directory and no Supabase CLI
usage. Apply SQL through the Supabase SQL editor and hand-update `schema.sql` in the same change.

---

## Architecture

- **App Router, server/client split.** Every route is a server `page.tsx` that does auth + data
  fetching, then renders a sibling `'use client'` component named `<Thing>Client.tsx`. Most route
  folders also have a `loading.tsx`. Follow this pattern for new routes.
- **Three Supabase clients**, all in `src/lib/`:
  - `supabase.ts` — browser client (`createBrowserClient`)
  - `supabaseServer.ts` → `getServerSupabase()` — server client over Next `cookies()`
  - `supabaseServer.ts` → `getServerSupabaseFromToken(token)` — server client over a Bearer token
- **There is no service-role client anywhere.** Every query runs as the calling user under RLS.
  `SUPABASE_SECRET_KEY` sits in `.env.local` but is referenced by zero lines of code. Do not add a
  service-role client without an explicit decision — RLS is currently the real authorization
  boundary.
- **There is no `middleware.ts`**, deliberately. Auth is enforced by SSR checks in `page.tsx`, by
  `lib/adminAuth.ts` / `lib/managerAuth.ts` in API routes, and by RLS underneath both.
- **State**: three React contexts (`AuthContext`, `CountdownContext`, `ThemeContext`) nested in
  `app/layout.tsx`. No Redux/Zustand. SWR appears in exactly two components.
- Queries live inline in server components and API routes. There is no DAL and no generated
  Supabase types — every PostgREST query is untyped.

### Roles

Three tables — `users`, `admins`, `managers` — and precedence is **manager > admin > regular**
(`contexts/AuthContext.tsx`). A user in both staff tables resolves to `manager`.

| | Admin | Manager |
|---|---|---|
| Create problems/contests | yes, but they land **pending** (`is_active = false`) | yes; contests go **live immediately** |
| Flip `is_active` | no | yes |
| Edit/delete an *activated* contest | **no** (route returns 403) | yes |
| Scope | only content they created | everything |
| Manage users / promote staff | no | yes |

Staff accounts are created by SQL or by an existing manager at `/manager/usermanagement/[id]`.
There is no self-service promotion.

---

## Database contract

`schema.sql` at the repo root is the source of truth. It is idempotent and safe to re-run.

Facts that are easy to get wrong:

- **`problems` has NO `contest` column.** The problem↔contest relationship lives in the
  `contest_problems` junction table. Any code selecting `problems.contest` is broken — see
  [Known broken](#known-broken--dead-code).
- **`submissions.status` is a GENERATED STORED column** — derived from
  `summary->>'failed'` and `summary->>'total'`. Never insert or update it.
- **`submissions.problem_id` and `submissions.user_id` have no foreign keys.** Orphans are
  possible; cascades do not apply.
- **Contest status is never stored.** Always compute it with `getContestStatus()`
  (`utils/contestStatus.ts`). Both timestamps null means `virtual`, not `inactive`.
- **Compile errors are stored inside the `summary` JSON** as
  `{ ...summary, verdict: 'CE', compileError: '...' }`, because there is no `verdict` column. A
  migration for a real column was planned and never landed. Readers must look inside `summary`.
- `problems.time_limit` is **milliseconds**; `problems.memory_limit` is **MB**.
- `submissions.language` has a CHECK constraint allowing exactly
  `python3, pypy3, cpp14, cpp17, cpp20, cpp23, python, cpp` — the same set the judge accepts.
- Scoring lives in two SQL RPCs: `recalculate_problems_solved(uid)` and
  `recalculate_user_points(uid)`. The points formula (top-100 problems, `points * 0.95^i`, plus a
  `150 * (1 - 0.997^n)` bonus) is mirrored in the `/pointsystem` page — change both together.
- Two storage buckets: `avatars` (50 MB, per-user folder) and `problem_images` (5 MB).

---

## Judge integration

The judge is the only external service. **All four call sites are server-side only**, and each is a
single synchronous `fetch` — no polling, no webhooks, no queue, no retries, no timeout, no circuit
breaker. The browser's submit request blocks until the judge has run every test case.

Auth header is **`X-Judge-Token`** (not `Authorization`), and its value must byte-match the judge's
own `JUDGE_SHARED_SECRET`.

| App route | Judge endpoint | Notes |
|---|---|---|
| `api/problems/[id]/submit/route.ts` | `POST /submit` | Grade a submission |
| `api/admin/problems/generator/generate/route.ts` | `POST /generate-tests` | Run a C++ generator |
| `api/manager/problems/generator/generate/route.ts` | `POST /generate-tests` | same |
| `api/status/health/route.ts` | `GET /health` | `/status` page proxy |

**`POST /submit`** sends `{ language, code, input, output, timeLimit, memoryLimit }` where `input`
and `output` are the problem's jsonb string arrays and must be equal length. It returns
`{ summary: {total, passed, failed}, results: TestResult[], compileError? }`.

- **A compile error is HTTP 200**, not an error status — with `summary = {0,0,0}`, `results = []`,
  and a `compileError` string. Branch on `compileError` before reading `summary`.
- 4xx/5xx from the judge means the *request* or the *judge* is wrong, never the user's code.
- The judge declares `CE` and `IE` verdicts but never actually emits them; `deriveVerdict` there can
  only return `AC | WA | TLE | MLE | RE`. That is why this app synthesizes the `CE` verdict itself.

**`POST /generate-tests`** sends `{ language: 'cpp', code }`. The generator binary must print a JSON
array of input strings to **stdout** and a JSON array of expected outputs to **stderr**, equal
length. Contract documented in `main/public/generator.md` and both help pages.

**Rate limiting is a shared, app-wide budget.** The judge allows 60 requests/minute keyed on
`ip|token`, with one limiter instance covering `/submit` *and* `/generate-tests`. Because the judge
never calls `app.set('trust proxy')` and every request from this app carries the same token, the
entire application shares a single 60/min bucket in production. Expect 429s during bulk activity.

`NEXT_PUBLIC_JUDGE_URL` carries the public prefix (so it *is* inlined into client bundles) but is
only ever read server-side. The browser must not learn the judge URL directly — that is why
`/status` proxies through `api/status/health` rather than fetching the judge.

---

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL; also the base for public storage URLs |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Modern replacement for the legacy anon key |
| `NEXT_PUBLIC_BASE_URL` | Absolute URLs for SEO (`metadataBase`, robots, sitemap) |
| `NEXT_PUBLIC_JUDGE_URL` | Judge base URL; defaults to `http://localhost:4001` |
| `JUDGE_SHARED_SECRET` | `X-Judge-Token` value. Read **only** in `lib/env.ts`; hard error if empty in production |
| `SUPABASE_SECRET_KEY` | Present in `.env.local`, **used by no code**. Candidate for removal + rotation. |

`lib/env.ts` is server-only. Importing it from a client component yields `undefined` at runtime,
because Next only inlines `NEXT_PUBLIC_`-prefixed vars into the browser bundle. Never rename
`JUDGE_SHARED_SECRET` to add that prefix.

> **Env file location.** The `.env.local` on disk currently sits at the **repo root**
> (`wmoj-app/.env.local`), while the README instructs you to create `main/.env.local`. Next.js
> loads dotenv files relative to the project directory, so a `npm run dev` from `main/` will not
> pick up the root file. Verify which one is actually loaded before changing env handling.

---

## Domain invariants

Break these and the stats silently drift:

1. **Submissions are persisted only for active problems.** Staff test-submissions against
   unpublished problems still run through the judge and render in the UI, but no row is written.
   This is load-bearing: the stat RPCs assume `submissions` only ever contains rows for active
   problems, which is why they carry no `is_active` filter.
2. **Points and solved-counts recalculate only on a first solve** — or when a manager deletes a
   submission (that route triggers a recalc). Nothing else recomputes them.
3. **Contest-problem eligibility** (implemented in 4 places — admin create/PATCH, manager
   create/PATCH):
   - A problem in a **rated** contest that is `ongoing` or `upcoming` cannot be added to any other
     contest.
   - If the **target** contest is rated, it may only contain problems not already in another
     contest.
   - Unrated contests share problems freely.
4. **Join/leave**: joining writes `join_history` + `contest_participants` + a server-authoritative
   `countdown_timers` row. `join_history` is permanent and blocks rejoining unless the contest is
   `virtual`. A user may be in only one contest at a time (app-enforced, not DB-enforced).
5. **`checkTimerExpiry` fails closed** — any DB error or missing timer means "expired".
   `getTimerStatus` is *destructive*: reading an expired timer deletes the timer row, deletes the
   participant row, and stamps `left_at`.
6. **Contest leaderboards are not point-weighted.** Each problem contributes at most 1.0
   (best `summary.passed / summary.total`). Only non-virtual joiners are ranked, unless no
   non-virtual joiners exist (backward compat for pre-`is_virtual` contests).
7. **The generator staleness guard is deliberate.** On *create*, editing the generator after
   generating blocks submit, so `generator_file` always matches the stored tests. On *edit* there
   are two distinct states — one blocks, one only warns. Read the comments before touching
   `generatedFor`.

---

## Conventions

- Server `page.tsx` + `<Thing>Client.tsx` split; add a `loading.tsx`.
- Tailwind v4 with CSS-variable design tokens: use `bg-surface-2`, `text-text-muted`,
  `text-brand-primary`, `border-border` rather than raw colors. `.glass-panel` is the universal card
  (solid surface + border + radius, despite the legacy name).
- `DataTable<Row>` for tables; `Pagination` for URL-driven server pagination, `ClientPagination` for
  in-memory paging.
- `toast.*` for action feedback; inline `bg-error/10` panels for form errors.
- API errors: `NextResponse.json({ error }, { status })`. Clients read `json.error || 'fallback'`.
- Hidden resources return **404, not 403** (`canUserAccessProblem` / `canUserAccessContest`) —
  deliberate non-disclosure. Match it.
- Reuse `getAdminSupabase` / `getManagerSupabase` from `lib/` instead of re-inlining the
  Bearer-or-cookie preamble (it is currently duplicated in ~8 routes; don't add a ninth).

## Don't

- **Don't make `AuthContext`'s `onAuthStateChange` callback async.** Awaiting inside it deadlocks
  against Supabase's `_initialize()`, producing 30-second profile loads. The comment there explains
  the cycle.
- **Don't add client-side role checks to `AdminGuard` / `ManagerGuard`.** They intentionally do not
  re-check roles — a stale access token made the browser query return `'regular'` and kicked staff
  out on reload. Enforcement is server-side.
- **Don't write to `submissions.status`** (generated column).
- **Don't query `problems.contest`** (no such column).
- **Don't assume dark mode works.** `ThemeContext` hard-codes light and `ThemeToggle` is literally a
  component that returns `null` — yet both are still imported and rendered in several places.
- **Don't "fix" an unused API route before checking whether anything calls it.** ~16 routes are dead,
  several superseded by server components.

---

## Known broken / dead code

Documented so agents don't rediscover them or assume they are intentional.

**Bugs:**
- Four sites query the nonexistent `problems.contest` column: `api/admin/problems/[id]/route.ts`
  (GET always 500s), `api/manager/problems/[id]/route.ts` (same), `api/problems/standalone/route.ts`
  (endpoint always 500s), and `app/contests/page.tsx` + `api/contests/route.ts` (error swallowed by
  an `if (!problemsErr)` guard, so the "N problems" badge on `/contests` is silently always absent).
- The admin edit-problem **"Active" checkbox is a no-op** — the client sends `is_active`, but the
  admin PATCH route never reads it (only the manager route does). It reports success and changes
  nothing.
- `join_history` upserts in `api/contests/[id]/leave` and `utils/timerCheck.ts` have **no matching
  RLS UPDATE policy**, so `left_at` is never recorded on conflict. Both call sites only `console.log`
  the error, so leaving *appears* to succeed.
- Manager-created *problems* land inactive while manager-created *contests* go live — asymmetric and
  probably unintended.

**Dead modules (zero importers):** `utils/userRole.ts`, `utils/participationCheck.ts`,
`types/activity.ts`, `hooks/useAnimations.ts`, `components/layout/Sidebar.tsx`, all of
`components/landing/*`, `components/ui/Input.tsx`, `components/ui/EmptyState.tsx`, and the
`create-next-app` leftover SVGs in `public/`. `components/tableThemes.ts` has 6 named variants that
all alias the same object and a `getTableTheme()` that ignores its argument.

**Duplication worth consolidating when you're already in the area:** the contest leaderboard
algorithm (~80 lines, twice — the API copy is dead), the submission-detail modal (5 near-identical
copies), the admin/manager help pages (~95% identical, with a 60-line generator example inlined in
both *and* in `public/generator.md`).

**Cosmetic drift:** `/tips` tells users they can submit in Java (not a supported language); both help
pages link to `#judge` and `#timers` anchors that don't exist; `sitemap.ts` lists `/auth/register`
(the route is `/auth/signup`) and includes inactive problems; default base URL differs between
`layout.tsx` (`wmoj.ca`) and `robots.ts`/`sitemap.ts` (`wmoj.com`); `AppShell` and
`ActiveContestRedirect` still special-case a `/poopthrower` route that no longer exists.

---

## Security notes

Current RLS is broadly permissive. Before widening any policy, know where it already stands:

- **`submissions` is world-readable including the `code` column.** Anyone, signed in or not, can read
  every user's source through PostgREST. During a live contest this permits trivial cheating. A
  narrower per-user policy exists but is OR'd with the broad one, so it constrains nothing today.
- **`users` is world-readable including `email`.**
- **`problems` is world-readable including `input`/`output` test data**, regardless of `is_active` —
  the app's gating is UI-level only.
- **`problem_images` storage lets any authenticated user upload or delete any object** in the bucket.
- `api/auth/check-availability` is unauthenticated and unthrottled — an email-enumeration oracle.
- A few manager RLS policies (`managers_delete_comments`, `managers_all_comment_votes`) omit the
  `is_active = true` check that every other manager policy has, so a deactivated manager keeps those
  powers. Similarly, SSR page guards check only for a staff row's existence, while the API guards
  also check `is_active`.
- ~27 `console.log` calls in API routes log full request bodies and query results.

Never commit `.env.local` (it is git-ignored via `.env*`).

---

## Related repo

`wmoj-judge` — the sandboxed execution service this app calls. It has its own `AGENTS.md` with the
sandbox model, the full API contract, and its own set of do-not-touch rules. A change to the
`/submit` request or response shape is a **cross-repo breaking change**; coordinate both sides.

---

## Keeping this file current

**If you are an agent working in this repo and you notice anything in this `AGENTS.md` that is
outdated, stale, incorrect, or missing — update it as part of your change.** That includes: a
documented bug you just fixed, a dead module you deleted, a convention that has shifted, a new
command or environment variable, a changed judge contract, or knowledge you had to discover the hard
way that isn't written down here. This file is only useful while it is accurate; treat letting it go
stale as leaving the work unfinished.
