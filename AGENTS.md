# wmoj-app — agent guide

WMOJ (White Oaks Modern Online Judge), a competitive-programming platform run by the White Oaks
Secondary School CS Club. This repo is the web app + backend-for-frontend: **Next.js 16 (App
Router) + React 19 + Tailwind v4 on Supabase**, deployed to Vercel.

Code execution and grading live in a separate repo/service, **`wmoj-judge`**, called over HTTP.

## The app is `main/`, not the repo root

```
wmoj-app/          ← repo root. NOT the Next.js project.
├── .agents/       ← agent config; `.claude` is a symlink to it, both tracked in git
├── supabase/migrations/ ← DB history; the first file is the full baseline schema
├── package.json   ← Vercel shim with no scripts; exists only to ship @vercel/analytics
└── main/          ← the Next.js app. Run every npm command from here. Vercel's Root Directory
    │                 points here, set in the dashboard only — nothing in the repo says so.
    └── src/       ← `@/*` → `main/src/*`
```

## Skills

Load these rather than re-derive what they cover; their `.claude/skills/…` paths are correct.

- **`add-problem`** — publishing problems end to end: statement, figures, the `generator.cpp` house
  style, the test-case budget, custom checkers, live-judge verification, the database insert.
- **`local-dev`** — running the whole stack on a laptop: Supabase CLI, a local database whose schema
  matches prod, pointing the app at it, the parity check, staff bootstrap, what cannot be tested.

## Commands

```bash
cd main
npm install
npm run dev      # next dev --turbopack → :3000
npm run build    # next build --turbopack
npm run lint     # bare eslint; leave the files you touch clean
npx tsc --noEmit # the typecheck — no npm script exists for it
```

**No tests, no test tooling, no CI.** Never invent `npm test`; verify by running the app. Next 16
does not run ESLint during `build`, so run `npm run lint` yourself — it is currently at **zero**
problems and must stay there. `npm run build` *is* the typecheck gate.

Node ≥20.9. Tailwind v4 is CSS-first: **no `tailwind.config.*`**, tokens live in `app/globals.css`.

**Seven env vars, none validated at boot** — see `.env.example`, which is the list. `SUPABASE_SECRET_KEY`
is server-only and bypasses RLS.

Commits are Conventional Commits, lowercase after the colon. **Never add an agent co-author trailer.**

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
- **No `middleware.ts`** — deliberate. Auth = SSR checks in `page.tsx` via `lib/staffAuth.ts`
  (`requireActiveManager()`/`requireActiveAdmin()`) plus `lib/adminAuth.ts`/`lib/managerAuth.ts` in
  API routes, with **RLS as the real boundary**.
- **Exactly ONE service-role client**, `lib/supabaseAdmin.ts`, with two callers: `problems/[id]/submit`
  (test data) and `problems/[id]/page.tsx` (case count), both on `problem_tests`. It bypasses RLS and
  is `server-only`, so a client-component import is a build error — and **never let its result become
  a client-component prop**. No `SUPABASE_SECRET_KEY` ⇒ nothing grades. Do not add a third caller.
- **No generated Supabase types.** Clients are untyped and queries inline, so nothing in the type
  system catches a bad `.select()`. Check column names against the schema by hand.
- **Every route has a `loading.tsx`** (42; only `app/auth/*` lack one), built from
  `components/SkeletonLoader.tsx` + `loading-shimmer`, in `role="status" aria-busy="true"` with
  `sr-only` text. It must mirror the real page's chrome. Add one per route.
- State: `AuthContext`, `CountdownContext`, `ThemeContext`. No Redux. SWR in two components only.

**Roles: manager > admin > regular.** Admin-created problems and contests land *pending*
(`is_active = false`); manager-created contests go live immediately. Only managers flip `is_active`,
manage users, or edit an already-activated contest.

## `admin/*` and `manager/*` are twin trees — edit both

Nearly every `app/api/admin/**` route has an `app/api/manager/**` twin, and the page/client trees
mirror them too. Changing one and not the other is the most common defect in this repo — grep the
twin path first. Manager also owns `newsposts` and `users/[id]/*`, which have no admin twin.

The deltas are deliberate and must survive any sync:

- `is_active` — admin creations land pending; manager-created contests go live immediately.
- The activated-contest PATCH/DELETE guard exists on the **admin** side only — it blocks admins from
  touching a live contest, which is what "only managers edit an already-activated contest" requires.
- `created_by` ownership scoping is **admin** only; managers see everything.
- The manager `submissions/[id]` DELETE calls `recalc_user_stats`. **The admin one was deleted** — no
  `submissions` DELETE policy fits an admin, so it silently deleted 0 rows. Do not reintroduce it.

## Database

Live Supabase project **`WMOJ`** (ref `usltyqkrptaaktnmjeyf`, us-east-2, Postgres 17): 14 tables, RLS
on all of them, two public buckets (`avatars`, `problem_images`, 5 MB per object). Inspect it with the
Supabase MCP. No drift detection — live and `supabase/migrations/` agree only because you keep them
agreeing; `local-dev` replays them onto an empty database and fingerprints the result against prod.

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

- **`problems` has NO `contest` column.** The relationship is the `contest_problems` junction: count
  membership by joining it, derive "standalone" by anti-joining it. Nothing in `main/src` names the
  column now. Don't reintroduce it.
- **`submissions.status` is GENERATED STORED** from `summary->>'failed'`/`'total'`. Never write it.
- **`submissions.problem_id`/`user_id` have no FKs.** Orphans are possible.
- **Contest status is never stored** — always compute it with `getContestStatus()`. Both timestamps
  null means `virtual`, not `inactive`.
- **Compile errors live in the `summary` JSON** (`{verdict:'CE', compileError}`); no `verdict` column.
- Scoring lives in `recalculate_problems_solved(uid)` / `recalculate_user_points(uid)` (top-100
  problems, `points * 0.95^i`, plus a `150*(1-0.997^n)` bonus). Both are now **revoked from `anon`
  and `authenticated`** — call the guarded wrapper `recalc_user_stats(target)` instead. The
  `/pointsystem` page mirrors the formula — change both together.
- RLS is broadly permissive on **reads**: `submissions` (**including `code`**), `users` (including
  `email`) and `problems` are world-readable. Every *write* policy is tight — never read this as
  blessing a permissive write policy.
- **The graded data lives in `problem_tests`, not `problems`.** `input`, `output` (the answer key),
  `checker` and `generator_file` moved to a staff-only side table — RLS filters rows, not columns, so
  on world-readable `problems` they were public — and were then DROPPED from `problems`. One copy,
  no fallback. Staff read it through the ordinary client, the submit route through
  `lib/supabaseAdmin.ts`. **Never select it into anything a browser receives.**

## Judge integration

Four **server-side-only** call sites, each a single synchronous `fetch` — no retries, no timeout, no
queue. The browser's submit blocks until every test case has run. The auth header is
**`X-Judge-Token`** (not `Authorization`), carrying `JUDGE_SHARED_SECRET`.

| App route | Judge endpoint |
|---|---|
| `api/problems/[id]/submit` | `POST /submit` |
| `api/{admin,manager}/problems/generator/generate` | `POST /generate-tests` |
| `api/status/health` | `GET /health` |

Those two `generate` routes differ only in their two auth lines. Changing one alone is the classic
miss.

`POST /submit` sends `{language, code, input, output, timeLimit, memoryLimit, checker?}` — `checker`
**omitted entirely** when null or blank — and returns
`{summary:{total,passed,failed}, results[], effectiveMemoryLimitMb, compileError?, checkerError?}`.

**Both failure modes come back as HTTP 200.** The route branches on `checkerError` **first**,
returns early, and stores **no submission row**: a broken checker is a problem-configuration fault,
never the student's. Only then does it branch on `compileError`. A 4xx/5xx means the request or the
judge is wrong, never the user's code; the judge never emits `CE` — this app synthesizes it. **This
app writes the verdict; the judge never touches Supabase.** Rows are inserted only
`if (problem.is_active)`, and a failed insert must surface as `stored: false`, never as a silent AC.
The three `aggregateVerdict*` functions must rank the **full** verdict set, `IE` first — a per-case
`IE` is a broken problem, not a wrong answer.

`NEXT_PUBLIC_JUDGE_URL` is read **server-side only**; the browser must never learn the judge URL
(hence `/status` proxying through `api/status/health`), and `api/status/health` must not forward the
judge's body. Never import `lib/env.ts` or `lib/supabaseAdmin.ts` from a client component.

## Invariants

1. **Submissions persist only for active problems.** Staff test-submissions against unpublished
   problems run and render but are never stored — the stat RPCs depend on this and carry no
   `is_active` filter.
2. **Points/solved recalculate only on a first solve**, or when a manager deletes a submission.
3. **Contest-problem eligibility**: a problem in a *rated* contest that is ongoing or upcoming can't
   be added elsewhere; a *rated* target contest accepts only problems not already in another contest.
4. **`checkTimerExpiry` fails closed** (any error ⇒ expired). `getTimerStatus` is *destructive*:
   reading an expired timer deletes the timer and participant rows and stamps `left_at` on
   `join_history`. Stamp it with `.update()` on `(user_id, contest_id)`, never `.upsert()` — the
   default conflict target is the `id` PK, so it raises `23505`. `countdown_timers` has the same
   PK/UNIQUE split; `api/contests/[id]/join` now passes `onConflict` on both writes.
5. Contest leaderboards are **not point-weighted** — each problem contributes at most 1.0.
6. The generator staleness guard is deliberate: on create it blocks submit, on edit one state blocks
   and another only warns, so `generator_file` always matches the stored tests.

## Conventions & don'ts

- Tailwind v4 tokens (`bg-surface-2`, `text-text-muted`, `text-brand-primary`, `border-border`), not
  raw colors; `.glass-panel` for cards; `DataTable` for tables; `toast.*` for action feedback.
- **No `Button` component, and no `cn`/`clsx`/`twMerge`/`cva`** — none installed. Raw `<button>`s
  with template-literal ternaries *are* the convention; every component takes `className?` last.
  Use `ui/Modal.tsx` for any dialog — it carries the focus trap and the `aria` wiring.
- **Put `data-surface="light"` on any dropdown inside `UserNavbar`.** `globals.css` re-declares the
  raw vars dark under `[data-navbar]`; omitting it renders dark-on-dark. A repeat bug.
- **`MarkdownRenderer`'s rehype order `rehypeRaw → rehypeSanitize → rehypeKatex` is
  security-critical.** Reordering it either opens XSS or silently kills all math.
- **Dark mode does not exist**: `<html className="light">` is hardcoded, `ThemeContext` is a frozen
  `{theme:'light'}`, `ThemeToggle` is `=> null`. Design tokens are contrast-checked for light only.
- Hidden resources return **404, not 403** (`canUserAccessProblem`/`canUserAccessContest`).
- Reuse `getAdminSupabase`/`getManagerSupabase` rather than re-inlining the Bearer/cookie preamble.
  Staff page guards go through `lib/staffAuth.ts`; API routes use those two helpers. No fifth spelling.
- **Check for callers before "fixing" an API route.** Server components query Supabase directly, so
  many of the 44 routes are dead. Grep for importers first — and prefer deleting to fixing.
- **Don't use `useSearchParams` in a client component** — derive filter state from server props,
  which avoids the Next 16 `<Suspense>` boundary requirement.
- **Lists paginate on the server.** `page.tsx` fetches one page (`parsePage` → `.range(computeRange(…))`
  with `{ count: 'exact' }` → `clampPage` + `redirect`); the client uses `usePaginatedNavigation` +
  `<Pagination>` + `<DataTable>`. Copy `app/admin/problems/manage/`, don't invent a variant. Never
  client-paginate a DB-backed list; never `setRows(prev => …)` after a mutation
  (`startTransition(() => router.refresh())`); never enrich beyond the current page's ids; and
  **never select `code`/`results` in a submission-list query** — `useViewCode` fetches them on
  demand. `DataTable` sorting is deliberately disabled: it only ever sorted the current page.

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
