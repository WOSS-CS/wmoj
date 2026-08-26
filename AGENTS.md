# wmoj-app — agent guide

WMOJ (White Oaks Modern Online Judge), a competitive-programming platform run by the White Oaks
Secondary School CS Club. This repo is the web app + backend-for-frontend: **Next.js 16 (App
Router) + React 19 + Tailwind v4 on Supabase**, deployed to Vercel.

Code execution and grading live in a separate repo/service, **`wmoj-judge`**, called over HTTP.

## The app is `main/`, not the repo root

```
wmoj-app/          ← repo root. NOT the Next.js project.
├── .agents/       ← agent config; `.claude` is a symlink to it, both tracked in git
│   └── skills/
├── supabase/
│   └── migrations/ ← DB history; the first file is the full baseline schema
├── package.json   ← 62-byte Vercel shim with no scripts; exists only to ship @vercel/analytics
└── main/          ← the Next.js app. Run every npm command from here. Vercel's Root Directory
    │                 points here, set in the dashboard only — nothing in the repo says so.
    ├── .env.local
    └── src/       ← `@/*` → `main/src/*`; alias imports outnumber relative ones roughly 8:1
```

## Skills

Load these rather than re-derive what they cover; their `.claude/skills/…` paths are correct.

- **`add-problem`** — publishing problems end to end: statement format, figures, the `generator.cpp`
  house style, the test-case budget, custom checkers, live-judge verification, the database insert.
- **`list-pages`** — adding or editing any paginated list/table page: the server pagination recipe,
  the optimistic client hooks, filters and debounced search, per-page enrichment, `loading.tsx`.

## Commands

```bash
cd main
npm install
npm run dev      # next dev --turbopack → :3000
npm run build    # next build --turbopack
npm run lint     # bare eslint; leave the files you touch clean
npx tsc --noEmit # the typecheck — no npm script exists for it
```

**No tests, no test tooling, no CI, no `.github/`.** Never invent `npm test`; verify by running the
app. Next 16 does not run ESLint during `build`, so lint breakage is invisible unless you run it.
`next.config.ts` is empty and sets no `ignoreBuildErrors`, so `npm run build` *is* a typecheck gate.

Node ≥20.9. Exact pins: `next` 16.0.10, `react`/`react-dom` 19.1.0, `tailwindcss` 4.1.13 (CSS-first,
so there is **no `tailwind.config.*`** — tokens live in `app/globals.css`), `typescript` 5.9.2,
`@supabase/supabase-js` 2.57.4, `@supabase/ssr` 0.7.0.

Six env vars, **none validated at boot**: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_JUDGE_URL`,
`JUDGE_SHARED_SECRET`, `NODE_ENV`. The `add-problem` scripts additionally need `SUPABASE_SECRET_KEY`.

Commits are ~74% Conventional Commits, lowercase after the colon. **Never add an agent co-author
trailer** — 16 old commits carry one, the last in May 2026; current practice complies and must stay.

## Architecture

- **Server/client split, no exceptions**: 44 `page.tsx` (auth + data fetching) and 44 sibling
  `'use client'` `*Client.tsx`. No `page.tsx` contains `'use client'`. Follow this.
- **No Server Actions anywhere** (`'use server'` = 0). Every mutation goes through an
  `app/api/**/route.ts` handler, called with `fetch` from a client component.
- **Next 16 async params**: every dynamic route and every page taking `searchParams` types them
  `Promise<{…}>` and awaits — 48 files, zero violations. Keep it that way.
- **Three Supabase clients** in `src/lib/`, all on the publishable (anon) key: `supabase.ts`
  (browser), `supabaseServer.ts` → `getServerSupabase()` (cookies, 49 sites) /
  `getServerSupabaseFromToken()` (Bearer, 25 sites).
- **No service-role client, no `middleware.ts`** — both deliberate. Auth = SSR checks in `page.tsx`
  plus `lib/adminAuth.ts`/`lib/managerAuth.ts` in API routes, with **RLS as the real boundary**.
- **No generated Supabase types.** Every client is an untyped `SupabaseClient` and queries are
  inline, so nothing in the type system catches a bad `.select()` — which is exactly how the
  missing-`contest`-column bug below survived. Check column names against the schema by hand.
- **Every route has a `loading.tsx`** (42; only the four `app/auth/*` routes lack one), built from
  `components/SkeletonLoader.tsx` + the `loading-shimmer` class, wrapped in `role="status"
  aria-busy="true"` with `sr-only` text. `useOptimisticPathname` highlights the clicked nav item in
  the three shells; `AppShell` shows a full-page skeleton across a shell change. Add one per route.
- State: `AuthContext`, `CountdownContext`, `ThemeContext`. No Redux. SWR in two components only.

**Roles: manager > admin > regular.** Admin-created problems and contests land *pending*
(`is_active = false`); manager-created contests go live immediately. Only managers flip `is_active`,
manage users, or edit an already-activated contest.

## `admin/*` and `manager/*` are twin trees — edit both

All 14 `app/api/admin/**` routes have an `app/api/manager/**` twin, ~90% character-identical
(`problems/search` differs in 11 of its 94 lines), and the page/client trees mirror them too.
Changing one and not the other is the most common defect in this repo — grep the twin path first.
Manager additionally owns `newsposts` and the `users/[id]/*` promotions, which have no admin twin.

The deltas are deliberate and must survive any sync:

- `is_active` — admin creations land pending; manager-created contests go live immediately.
- The activated-contest PATCH/DELETE guard exists on the **manager** side only.
- `created_by` ownership scoping is **admin** only; managers see everything.
- `api/manager/submissions/[id]` DELETE calls the recalc RPCs and `api/admin/submissions/[id]`
  DELETE does not — **a known bug**: deleting a passing submission as an admin leaves stale `points`.

## Database

Live Supabase project **`WMOJ`** (ref `usltyqkrptaaktnmjeyf`, us-east-2, Postgres 17): 13 tables,
RLS on all of them, 45 policies. Inspect it with the Supabase MCP (`list_tables`, `execute_sql`) and
read the baseline migration for the table list. There is no local Supabase, no `config.toml`, and no
drift detection — live and `supabase/migrations/` agree only because you keep them agreeing.

Two public storage buckets: `avatars` and `problem_images` (statement figures, 5 MB per object).

### Every schema change must be a new migration file

**Any change to the database's *shape* gets a NEW file in `supabase/migrations/`** — tables, columns,
constraints, indexes, RLS policies, functions, triggers, RPCs, enums, extensions, and storage buckets
or their policies — whether via the Supabase MCP, the dashboard, or the SQL editor. Row and data
changes get **no file**, however many rows: publishing a problem, editing a statement, flipping
`is_active`, creating contests or users, granting roles, recalculating points. Only shape counts.

- **Never edit an existing migration**, the baseline `20260814152742_initial_schema.sql` included.
  History stays append-only; correct a mistake with a new migration on top.
- Name files `YYYYMMDDHHMMSS_short_snake_case_description.sql` with the real current timestamp.
- One logical change per file, opening with a comment saying what it does and why. Idempotent where
  practical (`if not exists`, `or replace`), matching the baseline's style.
- Apply the SQL to the live project **and** commit the file in the same change — never one without
  the other, or the history silently drifts from reality.

### Easy to get wrong

- **`problems` has NO `contest` column.** The relationship is the `contest_problems` junction. Four
  routes still assume otherwise: `api/{admin,manager}/problems/[id]` GET **500 unconditionally**,
  `api/problems/standalone` 500s, and `api/contests` swallows the error and silently reports every
  contest's `problems_count` as 0. All are superseded by server components — don't copy the pattern.
- **`submissions.status` is GENERATED STORED** from `summary->>'failed'`/`'total'`. Never write it.
- **`submissions.problem_id`/`user_id` have no FKs.** Orphans are possible.
- **Contest status is never stored** — always compute it with `getContestStatus()`. Both timestamps
  null means `virtual`, not `inactive`.
- **Compile errors live in the `summary` JSON** (`{verdict:'CE', compileError}`); no `verdict` column.
- Scoring lives in the RPCs `recalculate_problems_solved(uid)` / `recalculate_user_points(uid)`
  (top-100 problems, `points * 0.95^i`, plus a `150*(1-0.997^n)` bonus). The `/pointsystem` page
  mirrors the formula — change both together.
- RLS is broadly permissive: `submissions` (**including `code`**), `users` (including `email`), and
  `problems` (including test data, regardless of `is_active`) are all world-readable. Know this
  before widening anything.

## Judge integration

Four **server-side-only** call sites, each a single synchronous `fetch` — no retries, no timeout, no
queue. The browser's submit blocks until every test case has run. The auth header is
**`X-Judge-Token`** (not `Authorization`), carrying `JUDGE_SHARED_SECRET`.

| App route | Judge endpoint |
|---|---|
| `api/problems/[id]/submit` | `POST /submit` |
| `api/{admin,manager}/problems/generator/generate` | `POST /generate-tests` |
| `api/status/health` | `GET /health` |

Those two `generate` routes are byte-identical twins; changing one alone is the classic miss.

`POST /submit` sends `{language, code, input, output, timeLimit, memoryLimit, checker?}` — `checker`
**omitted entirely** when null or blank — and returns
`{summary:{total,passed,failed}, results[], effectiveMemoryLimitMb, compileError?, checkerError?}`.

**Both failure modes come back as HTTP 200.** The route branches on `checkerError` **first**,
returns early, and stores **no submission row**: a broken checker is a problem-configuration fault,
never the student's. Only then does it branch on `compileError` (`summary = {0,0,0}`,
`results = []`). A 4xx/5xx means the request or the judge is wrong, never the user's code. The judge
never emits `CE` — this app synthesizes it. **This app writes the verdict; the judge never touches
Supabase** — no callback, no webhook, no polling. Rows are inserted only `if (problem.is_active)`.

`NEXT_PUBLIC_JUDGE_URL` carries the public prefix but is read **server-side only**; the browser must
never learn the judge URL (hence `/status` proxying through `api/status/health`). Never add
`NEXT_PUBLIC_` to `JUDGE_SHARED_SECRET`, and never import `lib/env.ts` from a client component.

## Invariants

1. **Submissions persist only for active problems.** Staff test-submissions against unpublished
   problems run and render but are never stored — the stat RPCs depend on this and carry no
   `is_active` filter.
2. **Points/solved recalculate only on a first solve**, or when a manager deletes a submission (see
   the admin-side gap above).
3. **Contest-problem eligibility**: a problem in a *rated* contest that is ongoing or upcoming can't
   be added elsewhere; a *rated* target contest accepts only problems not already in another contest.
4. **`checkTimerExpiry` fails closed** (any error ⇒ expired). `getTimerStatus` is *destructive*:
   reading an expired timer deletes the timer and participant rows. It also *attempts* to stamp
   `left_at` on `join_history` and **always fails silently** — the `.upsert()` passes no `onConflict`
   while the PK is `id` and `(user_id, contest_id)` is only UNIQUE, so it throws `23505`, and users
   have no UPDATE policy there. Both call sites swallow it; `left_at` is NULL for everyone. Bug.
5. Contest leaderboards are **not point-weighted** — each problem contributes at most 1.0.
6. The generator staleness guard is deliberate: on create it blocks submit, on edit one state blocks
   and another only warns, so `generator_file` always matches the stored tests.

## Conventions & don'ts

- Tailwind v4 tokens (`bg-surface-2`, `text-text-muted`, `text-brand-primary`, `border-border`), not
  raw colors; `.glass-panel` for cards; `DataTable` for tables; `toast.*` for action feedback.
- **No `Button` component, and no `cn`/`clsx`/`twMerge`/`cva`** — zero occurrences, none installed.
  99 raw `<button>`s across 42 files *is* the convention: template literals with ternaries, every
  component taking `className?` appending it last. `ui/EmptyState.tsx`/`ui/Input.tsx` have 0 importers.
- **Put `data-surface="light"` on any dropdown rendered inside `UserNavbar`.** `globals.css`
  re-declares the raw CSS vars dark under `[data-navbar]`; `[data-surface="light"]` resets them. Since
  `@theme inline` resolves at use-site, a panel omitting it renders dark-on-dark. A repeat bug.
- **`MarkdownRenderer`'s rehype order `rehypeRaw → rehypeSanitize → rehypeKatex` is
  security-critical.** Reordering it either opens XSS or silently kills all math.
- **Dark mode does not exist**: `<html className="light">` is hardcoded, `ThemeContext` returns a
  frozen `{theme:'light'}`, and `ThemeToggle` is literally `=> null` (still imported 6×).
- Hidden resources return **404, not 403** (`canUserAccessProblem`/`canUserAccessContest`).
- Reuse `getAdminSupabase`/`getManagerSupabase` rather than re-inlining the Bearer/cookie preamble.
  Admin auth is written four ways across 14 files, three skipping the `is_active` check — no fifth.
- API errors are `NextResponse.json({ error }, { status })` throughout; there are 2 deviations.
- **Check for callers before "fixing" an API route or a module.** Server components query Supabase
  directly, so 23 of the 51 routes are dead, several superseded outright. Grep for importers first.
- **Don't use `useSearchParams` in a client component** (0 usages) — derive filter state from server
  props instead, which avoids the Next 16 `<Suspense>` boundary requirement.

## Related repo

`wmoj-judge` has its own `AGENTS.md` covering the sandbox, the resource limits, and the full API
contract. Any change to the `/submit` or `/generate-tests` shape is a **cross-repo breaking
change** — coordinate both sides.

---

## Maintenance

Keep this file current — when you find something here outdated, wrong, or missing, fix it as part of
your change; letting it go stale is leaving the work unfinished. And keep it **at or under 250
lines**.

⚠️ **Maintenance here is ZERO-SUM.** The line budget is the point, not an accident: a file nobody
finishes reading is a file that does not guide anything. So the test for whether something belongs
in `AGENTS.md` is not "is this true and useful" — almost everything is — it is:

> **Is this worth removing something else to make room for?**

If the answer is no, it does not go here. If the answer is yes, name what you are cutting and cut it
in the same change. Only when there is genuinely spare room may you add without removing.

Three questions settle most cases:

1. **Does it have a detectable trigger?** ("when adding a paginated list", "when authoring a
   problem", "when extracting a statement figure") → it belongs in a **skill**, where it loads
   exactly when it is needed and costs nothing when it is not. This is the default answer; prefer it.
2. **Is it broad and unconditional** — something every change in this repository must respect
   regardless of what it touches? → it belongs here.
3. **Otherwise** → it is bloat. Delete it, or leave it as a comment beside the code it describes,
   which is where a narrow fact stays honest for longest.
