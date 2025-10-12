### WMOJ – Architecture, Design, and Developer Guide

WMOJ is a full‑stack coding contest platform. It provides:
- Contest management (create, list, activate) and participation flows
- Problem authoring with markdown content and IO testcases
- A stateless judge service to compile/run submissions and compute verdicts
- Auth, roles, and access control backed by Supabase



## Monorepo Layout

```
wmoj/
  ├─ main/           # Next.js (App Router) web app + API routes (edge/server)
  └─ judge/          # Node.js Express judge microservice
```


## Technology Stack

- Frontend: Next.js 15 (App Router), React 19, Tailwind CSS 4
- Server APIs: Next.js Route Handlers under `main/src/app/api`
- Auth, DB, storage: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Markdown: `@uiw/react-md-editor`, `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-sanitize`
- Judge service: Node.js (Express + `child_process` spawn) supporting Python, C++, and Java


## Environments and Required Variables

Set the following environment variables for the `main` app:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `NEXT_PUBLIC_JUDGE_URL`: Base URL for the judge service (e.g. `http://localhost:4001`)

Judge service:
- `PORT` or `JUDGE_PORT`: Port to bind (defaults to 4001)


## High-Level Architecture

- Web app (Next.js) serves pages and exposes route handlers (server APIs). It talks directly to Supabase from both client and server.
- Auth is via Supabase; the client holds a session token that the web app forwards to server APIs as a Bearer token when required.
- Admin-only features are guarded in the client and re‑enforced on the server by checking the `admins` table.
- The judge is a separate HTTP service. The web app calls it with the full source code, the problem inputs/outputs, and receives a per-test result set and summary.


## Data Model (Supabase Tables)

Inferred from code. Columns may include more fields in the actual DB; align migrations accordingly.
- `users`: `{ id, username, email, created_at, updated_at, last_login, is_active?, profile_data? }`
- `admins`: `{ id, is_active?, last_login?, updated_at? }`
- `contests`: `{ id, name, description, length, is_active, created_at?, updated_at? }`
- `problems`: `{ id, name, content, contest (nullable), input string[], output string[], created_at, updated_at, is_active? }`
- `contest_participants`: `{ user_id, contest_id }`
- `countdown_timers`: `{ user_id, contest_id, started_at, duration_minutes, is_active }`
- `submissions`: `{ id, problem_id, user_id, language, code, input, output, results, summary, created_at? }`
- `join_history`: `{ id, user_id, contest_id, joined_at, left_at? }`

Note: Array IO (`input`, `output`) are stored as arrays of strings, compared after whitespace normalization by the judge service.


## Auth and Roles

- Client initializes `supabase` with anon key. Server creates a Supabase Server Client via cookies or explicit Bearer tokens.
- `AuthContext` manages session state, profile creation, and role detection:
  - On sign in/up, it ensures a `users` row exists and updates `last_login`.
  - Checks `admins` for admin users and sets `userRole` accordingly.
- Guards:
  - `AdminGuard` protects admin pages by short‑circuiting via context role and confirming via `/api/admin/check`.


## Frontend Structure (App Router)

- Public pages under `main/src/app/`:
  - `page.tsx`: landing/home
  - `auth/login`, `auth/signup`
  - `contests` and `contests/[id]` (view contest, problems, leaderboard)
  - `problems` and `problems/[id]`
  - `dashboard` (regular users)
- Admin pages under `app/admin/*` (wrapped by `AdminGuard`):
  - `dashboard`
  - contests: `create`, `manage`
  - problems: `create`, `manage`
  - user management

Shared components/contexts/utilities:
- `contexts/AuthContext.tsx` for auth/session/role state
- Guards: `AdminGuard.tsx`, `AuthGuard.tsx`, `RegularOnlyGuard.tsx`
- Markdown editing/rendering components
- Utilities: `userRole.ts`, `participationCheck.ts`, `timerCheck.ts`


## Server API Surface (Next.js Route Handlers)

All endpoints live under `main/src/app/api`. Selected highlights:

- Admin
  - `GET /api/admin/check`: Validates bearer token and confirms membership in `admins`.
  - `POST /api/admin/contests/create`: Create a contest; admin‑only.
  - `GET /api/admin/contests/list`, `GET /api/admin/contests/[id]`: Manage contests.
  - `GET /api/admin/problems/list`, `GET /api/admin/problems/[id]`, `POST /api/admin/problems/create`: Problem CRUD.
  - `GET /api/admin/activity/recent-submissions`: Recent activity for admins.
  - `POST /api/admin/users/toggle`: Toggle user state.

- Contests
  - `GET /api/contests`: List contests
  - `GET /api/contests/[id]`: Fetch a specific active contest
  - `POST /api/contests/[id]/join`: Join contest; creates `countdown_timers` and `contest_participants`
  - `POST /api/contests/[id]/leave`: Leave contest; recorded in `join_history`
  - `GET /api/contests/[id]/problems`: List problems in a contest
  - `GET /api/contests/[id]/joined`: Whether current user has joined
  - `GET /api/contests/[id]/leaderboard`: Contest leaderboard
  - `GET /api/contests/[id]/timer`: Timer status for user/contest
  - `GET /api/contests/join-history`: Retrieve join history
  - `GET /api/contests/participation`: Participation overview

- Problems
  - `GET /api/problems/[id]`: Fetch single problem
  - `POST /api/problems/[id]/submit`: Submit code to judge; persists results to `submissions`
  - `GET /api/problems/standalone`: Non‑contest problems

- User
  - `GET /api/user/activity`: User submissions/activity


## Core Flows

### Authentication
1. User signs up or signs in via Supabase (`AuthContext`).
2. On session, the context ensures a `users` row exists (or updates `last_login`).
3. Role is resolved by checking `admins` vs `users` and stored in context.

### Admin Access
1. Admin pages are wrapped with `AdminGuard` which checks `userRole` from context.
2. As an authoritative check, `AdminGuard` calls `GET /api/admin/check` with a Bearer token.
3. Server validates the token and looks up the user in `admins`.

### Join Contest + Timer
1. `POST /api/contests/[id]/join` with Bearer token.
2. Server verifies contest is `is_active`, that the user hasn't left previously (`join_history`), and is not in another contest.
3. Inserts into `contest_participants` and creates/updates `countdown_timers` with `started_at` and `duration_minutes` set from contest length.
4. `GET /api/contests/[id]/timer` returns remaining time and contest name. When expired, timers are cleaned up.

### Submit Solution
1. Client calls `POST /api/problems/[id]/submit` with Bearer token and `{ language, code }`.
2. Server loads the problem IO, validates contest participation + timer (`checkTimerExpiry`).
3. Server calls the judge service `POST {JUDGE_URL}/submit` with `{ language, code, input, output }`.
4. Judge compiles/runs each test case with a 5s timeout per case and compares normalized output.
5. Server stores `{ results, summary }` in `submissions` and returns them to the client.


## Judge Service

Location: `judge/server.js`

Endpoints:
- `POST /submit` – Request body: `{ language: 'python'|'cpp'|'java', code: string, input: string[], output: string[] }`
  - Python: tries `python3` then `python`
  - C++: compiles with `g++ -O2 -std=c++17`
  - Java: compiles with `javac`, runs `java -classpath <tmp> Main`
  - Per‑case timeout: 5 seconds; whitespace normalized comparison
  - Returns: `{ summary: { total, passed, failed }, results: Array<...> }`
- `GET /health` – Health check
- `GET /selftest/python` – Quick runtime presence check

Operational notes:
- Uses OS temp directories to create isolated work dirs per submission.
- Attempts best‑effort cleanup of temp directories after each request.
- Requires relevant runtimes to be present on the host/container.


## Important Modules and Their Responsibilities

- `src/lib/supabase.ts`: Client‑side Supabase client (anon)
- `src/lib/supabaseServer.ts`: Server‑side Supabase clients
  - `getServerSupabase()`: cookie‑based session
  - `getServerSupabaseFromToken(token)`: explicit Bearer token
- `src/contexts/AuthContext.tsx`: Session lifecycle, profile creation, role detection
- `src/components/AdminGuard.tsx`: Client guard + server confirmation for admin routes
- `src/utils/timerCheck.ts`: Timer status/expiry helpers for route handlers
- `src/utils/participationCheck.ts`: Contest participation checks
- `src/types/*`: Type definitions for `Contest`, `Problem`, `User`


## Error Handling and Security

- All authz checks are enforced server‑side; client guards are UX only.
- Admin endpoints re‑check admin membership against `admins`.
- Submission endpoint rejects if contest timer expired or user not a participant.
- Judge service validates payload shape and enforces language allowlist; each case has an execution timeout.
- Output comparison collapses whitespace to reduce format‑only failures.


## Local Development

Although production testing is preferred, you can run locally for development:

Web app:
```
cd main
pnpm i  # or npm i / yarn
pnpm dev
```

Judge service:
```
cd judge
pnpm i  # or npm i / yarn
pnpm start  # exposes :4001 by default
```

Set `.env.local` for the `main` app with the required Supabase variables and judge URL. Ensure your Supabase project has the expected tables and policies.


## Deployment Overview

- Deploy `main` as a Next.js app (Vercel/Node host) with `NEXT_PUBLIC_*` env vars configured.
- Deploy `judge` as a long‑running service/container with Python/C++/Java runtimes available; expose `JUDGE_URL` to the web app.
- Supabase hosts Postgres, auth, and SSR helper APIs.


## Where to Start (Developer Tour)

1. Read `src/contexts/AuthContext.tsx` to understand auth lifecycle and role resolution.
2. Skim `app/api/*` route handlers to see server‑side permissions and DB access patterns.
3. Explore admin pages in `app/admin/*` for management workflows.
4. Review `judge/server.js` for submission execution and result shaping.


## Appendix: Selected Code References

Auth server client creation:
```8:27:main/src/lib/supabaseServer.ts
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {}
      },
    },
  });
}
```

Admin guard API check:
```33:55:main/src/components/AdminGuard.tsx
      try {
        const res = await fetch('/api/admin/check', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        router.replace('/dashboard');
      } finally {
        setCheckingAdmin(false);
      }
```

Submit flow (server → judge):
```60:88:main/src/app/api/problems/[id]/submit/route.ts
    const JUDGE_URL = process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
    const resp = await fetch(`${JUDGE_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, input: problem.input, output: problem.output }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'Judge error' }, { status: resp.status || 500 });
    }
```

