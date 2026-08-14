# About
Hello! Welcome to the repository for the WMOJ web application.

WMOJ (White Oaks Modern Online Judge) is a competitive programming platform created and maintained by the White Oaks Secondary School CS Club.
It was made to solve a simple problem: each year, our CS club would run a competition known as the WOSS Dual Olympiad, which had a competitive programming portion. To run the contest each year, we would have to go through the difficult process of contacting DMOJ admins (and paying 50 dollars) to host our contests on DMOJ.

To solve this problem, the WOSS CS club decided to create their own, tiny application specifically for running this yearly contest. Today, WMOJ has grown beyond just being a specialized app for running a single contest, to a full-fledged competitive programming platform hosting a multitude of contests and problems for users from all over Canada.

We welcome any and all open-source contributions to help make WMOJ better for everyone!

---

## Table of Contents

1. [Architecture overview](#architecture-overview)
2. [Repository layout](#repository-layout)
3. [Prerequisites](#prerequisites)
4. [Quick start (TL;DR)](#quick-start-tldr)
5. [Detailed setup](#detailed-setup)
   1. [Clone the repo and install dependencies](#1-clone-the-repo-and-install-dependencies)
   2. [Create a Supabase project](#2-create-a-supabase-project)
   3. [Apply the database schema (baseline migration)](#3-apply-the-database-schema-baseline-migration)
   4. [Configure Supabase Auth](#4-configure-supabase-auth)
   5. [Verify storage buckets](#5-verify-storage-buckets)
   6. [Run the judge backend (`wmoj-judge`)](#6-run-the-judge-backend-wmoj-judge)
   7. [Wire up environment variables](#7-wire-up-environment-variables)
   8. [Run the dev server](#8-run-the-dev-server)
   9. [Create your first admin / manager](#9-create-your-first-admin--manager)
6. [Project structure](#project-structure)
7. [Production builds](#production-builds)
8. [Troubleshooting](#troubleshooting)
9. [Contributing](#contributing)

---

## Architecture overview

WMOJ is split across **two repositories** that talk to each other over HTTP:

```
                  ┌────────────────────────────────────┐
                  │  Browser (React 19 / Next.js 16)   │
                  └──────────────┬─────────────────────┘
                                 │  Supabase Auth (cookies)
                                 │  & PostgREST queries
                                 ▼
            ┌──────────────────────────────────────────┐
            │       wmoj-app  (this repo)              │
            │   Next.js App Router  ·  Server actions  │
            │   API routes under /api/*                │
            └─────────┬──────────────────┬─────────────┘
                      │                  │
        Supabase JS   │                  │  HTTP + X-Judge-Token
                      ▼                  ▼
            ┌──────────────────┐   ┌───────────────────────┐
            │    Supabase      │   │  wmoj-judge           │
            │  Postgres + Auth │   │  (separate repo)      │
            │  + Storage       │   │  Express + nsjail     │
            └──────────────────┘   │  sandbox + seccomp    │
                                   └───────────────────────┘
```

* **`wmoj-app`** (this repo) — the Next.js front-end and BFF. Handles auth, problem/contest UI, the Monaco code editor, and proxies submission requests to the judge.
* **`wmoj-judge`** ([`WMOJ/wmoj-judge`](https://github.com/WMOJ/wmoj-judge)) — a stateless Node.js + Express service that compiles and runs user code inside an `nsjail` + seccomp sandbox. The app calls it server-side over HTTP with a shared-secret header.
* **Supabase** — Postgres database (with RLS for authorization), Supabase Auth (email + password, with verification), and Storage (avatars and problem images).

You can run the front-end without the judge (most pages still work), but you won't be able to grade submissions.

---

## Repository layout

```
wmoj-app/
├── README.md              ← you are here
├── supabase/
│   └── migrations/        ← DB history; first file is the full baseline schema
├── package.json           ← outer (Vercel analytics shim only)
└── main/                  ← the actual Next.js app
    ├── src/
    │   ├── app/           ← App Router pages, layouts, /api routes
    │   ├── components/    ← UI, layout, landing, primitives
    │   ├── contexts/      ← AuthContext, ThemeContext, CountdownContext
    │   ├── hooks/         ← useAnimations, etc.
    │   ├── lib/           ← Supabase clients, admin/manager auth helpers, env
    │   ├── types/         ← Problem, Contest, User, Comment, Activity types
    │   └── utils/         ← role checks, contest status, validation, etc.
    ├── public/            ← logo, icons, .well-known/
    ├── next.config.ts
    ├── tsconfig.json
    └── package.json       ← inner — the real one
```

The **outer** `package.json` exists only to ship `@vercel/analytics` for the Vercel deploy. All real dev work happens inside `main/`.

---

## Prerequisites

You need:

| Tool        | Version                | Why                                                                |
|-------------|------------------------|--------------------------------------------------------------------|
| Node.js     | **≥ 20**               | Next.js 16 + Turbopack require modern Node.                        |
| npm         | bundled with Node      | Or pnpm/yarn — but lockfiles are committed for npm.                |
| A Supabase account | free tier is fine | Hosts the Postgres DB, Auth, and Storage.                          |
| Docker      | optional but recommended | The judge backend ships as a Docker image.                       |
| Git         | any                    | Standard.                                                          |

You do **not** need to install Postgres locally — Supabase hosts it for you.

---

## Quick start (TL;DR)

For experienced contributors who just want the commands:

```bash
# 1. Clone
git clone https://github.com/WMOJ/wmoj-app.git
cd wmoj-app/main

# 2. Install
npm install

# 3. Create a Supabase project at https://supabase.com/dashboard
#    Then in the SQL editor, paste the contents of the baseline migration
#    ../supabase/migrations/20260814152742_initial_schema.sql  and run it.

# 4. Copy env vars (see "Wire up environment variables" below)
cp .env.local.example .env.local   # if the example exists; otherwise create from scratch
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_JUDGE_URL, JUDGE_SHARED_SECRET

# 5. Start the judge in another terminal (see wmoj-judge README)

# 6. Run the dev server
npm run dev
```

---

## Detailed setup

### 1. Clone the repo and install dependencies

```bash
git clone https://github.com/WMOJ/wmoj-app.git
cd wmoj-app/main          # the inner directory is the real app
npm install
```

> **Note:** all `npm` commands below should be run inside the `main/` directory unless stated otherwise.

### 2. Create a Supabase project

1. Sign in at <https://supabase.com/dashboard>.
2. Click **New project**, give it a name (e.g. `wmoj-dev`), set a strong DB password, pick a region close to you.
3. Wait ~2 minutes for the project to provision.
4. Open **Project Settings → API** and grab the values you'll need later:
   - **Project URL** — this is `NEXT_PUBLIC_SUPABASE_URL`.
   - **API Keys → `publishable`** (a `sb_publishable_...` key) — this is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

   > WMOJ uses the *publishable* key (the new replacement for the legacy `anon` key). The legacy `anon` key still works if your project is older.

### 3. Apply the database schema (baseline migration)

This is the **most important step** — without it, every page that hits the database will return RLS errors or "relation does not exist".

The database lives in [`supabase/migrations/`](./supabase/migrations/). The first file, [`20260814152742_initial_schema.sql`](./supabase/migrations/20260814152742_initial_schema.sql), is the baseline: a complete dump of WMOJ's production database structure as of 2026-08-14.

- **13 tables** (`users`, `admins`, `managers`, `problems`, `contests`, `contest_problems`, `contest_participants`, `join_history`, `countdown_timers`, `submissions`, `comments`, `comment_votes`, `news_posts`)
- **57 Row Level Security policies** across `public.*` and `storage.objects`
- **13 RPC functions** (`is_admin`, `is_manager`, `recalculate_problems_solved`, `recalculate_user_points`, `is_email_registered`, `is_username_taken`, `update_comment_score`, `update_updated_at_column`, …)
- **2 triggers** (comment-vote score recalc, news-post updated-at)
- **2 storage buckets** (`avatars`, `problem_images`)
- All indexes, foreign keys, check constraints, and the `uuid-ossp` / `pgcrypto` extensions.

The whole file is **idempotent** — every `create` is guarded by `if not exists`, `or replace`, or a `drop ... if exists` first, so running it twice does nothing harmful.

**To apply it:**

1. In your Supabase project, open **SQL Editor → + New query**.
2. Paste the entire contents of the baseline migration into the editor.
3. Click **Run**.
4. You should see "Success. No rows returned." If you see errors, see [Troubleshooting](#troubleshooting).
5. If `supabase/migrations/` contains further migrations, run them too, **in filename order** — the timestamp prefix is the ordering.

> **Migrations.** Every schema change after the baseline is recorded as its own timestamped file in `supabase/migrations/`, so the database's history stays traceable and reversible. Existing migrations are never edited — corrections go in a new file on top. You don't need the Supabase CLI to contribute: applying the files in order through the SQL editor works fine.

### 4. Configure Supabase Auth

WMOJ uses email-and-password authentication with email verification.

1. In your Supabase project, go to **Authentication → Providers**.
2. Make sure **Email** is enabled.
3. (Recommended for dev) Under **Authentication → Email Templates**, you can either:
   - Leave the default Supabase confirmation emails — they will be sent from `noreply@mail.app.supabase.io`.
   - Or, in **Authentication → Settings**, **temporarily disable "Confirm email"** so you can sign up and log in without checking your inbox during local development.
4. Under **Authentication → URL Configuration**, set:
   - **Site URL**: `http://localhost:3000` (for local dev).
   - **Redirect URLs**: add `http://localhost:3000/**`.

### 5. Verify storage buckets

The baseline migration already creates the `avatars` and `problem_images` buckets, but it's worth a quick sanity check. In **Storage**, you should see both buckets listed and both should be **public** (the schema sets them that way).

If they're missing, re-run the baseline migration — or recreate the buckets manually:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',        'avatars',        true, 52428800, array['image/*']),
  ('problem_images', 'problem_images', true,  5242880, array['image/png','image/jpeg','image/gif','image/webp'])
on conflict (id) do nothing;
```

### 6. Run the judge backend (`wmoj-judge`)

The judge runs as a separate process. Clone and run it:

```bash
# in a different terminal / directory
git clone https://github.com/WMOJ/wmoj-judge.git
cd wmoj-judge

# easiest path — Docker
docker build -t wmoj-judge .
docker run --rm -p 4001:4001 \
  -e JUDGE_SHARED_SECRET="$(openssl rand -hex 32)" \
  -e AUTH_STRICT=true \
  wmoj-judge
```

Note the `JUDGE_SHARED_SECRET` you used — you'll paste the **same** value into `.env.local` for `wmoj-app` in the next step. The two services authenticate each other with this shared token (`X-Judge-Token` header).

For full judge setup, sandboxing details, language matrix, and tuning options, see the [`wmoj-judge` README](https://github.com/WMOJ/wmoj-judge#readme).

### 7. Wire up environment variables

Create a `main/.env.local` file (it's git-ignored) with the following five variables:

```dotenv
# --- Supabase ---------------------------------------------------------
# From  Project Settings → API  in the Supabase dashboard.
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx

# --- Public app URL ---------------------------------------------------
# Used for absolute links in emails, OG tags, etc. For local dev:
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# --- wmoj-judge integration ------------------------------------------
# Where the judge listens. For local dev with the docker run above:
NEXT_PUBLIC_JUDGE_URL=http://localhost:4001

# Shared secret. MUST be byte-for-byte identical to the JUDGE_SHARED_SECRET
# you set when starting the judge container. Server-only — do NOT prefix
# with NEXT_PUBLIC_.
JUDGE_SHARED_SECRET=paste-the-same-value-you-used-for-the-judge
```

| Variable | Where it's read | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Public — embedded in client JS. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Public. RLS is what actually protects your data. |
| `NEXT_PUBLIC_BASE_URL` | server | Used for absolute URLs in server-rendered output. |
| `NEXT_PUBLIC_JUDGE_URL` | **server only** today (despite the prefix) | All judge calls happen in `/api/*` routes, never from the browser. |
| `JUDGE_SHARED_SECRET` | **server only** | Sent as the `X-Judge-Token` header. Must match the judge. |

> ⚠️ **Never** rename `JUDGE_SHARED_SECRET` to `NEXT_PUBLIC_JUDGE_SHARED_SECRET` — that would leak the token into client-side bundles. The validator on the judge side would reject every browser request, but the key would still be world-readable.

### 8. Run the dev server

```bash
# inside main/
npm run dev
```

This starts Next.js with Turbopack on `http://localhost:3000`. Open it, sign up, and verify:

- The home page renders news posts / contests (both empty for a fresh DB).
- `/auth/signup` works and (if email confirmation is on) sends a verification email.
- After login, `/problems` and `/contests` load without errors.

If the server logs show RLS errors like `permission denied for table users`, you most likely skipped step 3 or it errored part-way through.

### 9. Create your first admin / manager

There is no UI for self-promoting — you do this directly in the database. After signing up at least one user account, open the SQL editor and run:

```sql
-- Grab your auth user id (replace the email):
select id from auth.users where email = 'you@example.com';
-- → e.g. '8bba1d2e-...'

-- Make yourself a manager (managers can also do everything an admin can):
insert into public.managers (id, is_active)
values ('8bba1d2e-...', true)
on conflict (id) do update set is_active = true;

-- Or, if you want admin-only:
insert into public.admins (id, is_active)
values ('8bba1d2e-...', true)
on conflict (id) do update set is_active = true;
```

Reload the app and you should now see `/admin/...` and/or `/manager/...` routes.

---

## Project structure

A quick tour of `main/src/`:

| Path | What lives there |
|---|---|
| `app/` | The entire Next.js App Router. Top-level pages (`/problems`, `/contests`, `/users`, `/submissions`, `/auth/*`, `/admin/*`, `/manager/*`). |
| `app/api/` | All server-side API routes — auth checks, judge proxy (`/api/problems/[id]/submit`), admin/manager CRUD, contest join/leave/timer, status check. |
| `components/` | Plain React components. `ui/` (Badge, Input, Toast, EmptyState), `layout/` (AppShell, UserNavbar, sidebars), `landing/` (homepage marketing components), and many domain components like `CodeEditor`, `MarkdownRenderer`, `MarkdownEditor`, `CommentsSection`, `SubmissionHeatmap`, `DataTable`. |
| `contexts/` | React contexts: **AuthContext** (Supabase session + role + dashboard path), **ThemeContext**, **CountdownContext** (contest timer). |
| `hooks/` | Animation hooks (`useAnimations`). |
| `lib/` | `supabase.ts` (browser client), `supabaseServer.ts` (server / route-handler clients with cookie + bearer-token variants), `adminAuth.ts` / `managerAuth.ts` (request-scoped role guards), `env.ts` (judge secret accessor). |
| `types/` | TS interfaces for `User`, `Problem`, `Contest`, `Submission`, `Comment`, `Activity`, etc. |
| `utils/` | `userRole.ts`, `contestStatus.ts`, `participationCheck.ts`, `problemImages.ts`, `timerCheck.ts`, `validation.ts`. |

Notable design decisions:
- **No global Next.js middleware** — auth is enforced per-route via context guards (`AuthGuard`, `AdminGuard`, `ManagerGuard`) and per-API-route role checks.
- **Three-table role model** — `users`, `admins`, and `managers` are separate tables (not a `role` column). A user is whatever the most-privileged table they're in says they are.
- **Storage as the source of truth for images** — markdown content references `problem_images` URLs directly; deletion of a problem cascades a best-effort cleanup pass over storage.

---

## Production builds

```bash
# inside main/
npm run build       # next build --turbopack
npm run start       # next start, defaults to :3000
```

For Vercel, the project is set up to deploy `main/` directly. The outer `package.json` is only there because Vercel's analytics SDK lives at the repo root.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `permission denied for table <x>` from PostgREST | RLS is on but no policy matches your role | Re-run the baseline migration. If a single statement failed, it usually leaves things half-applied. |
| `relation "public.<table>" does not exist` | The migrations never ran, or only some sections ran | Re-run the migrations in filename order. They are idempotent. |
| Sign-up succeeds but login fails | Email confirmation is on but the email is sitting in spam | Disable "Confirm email" under **Auth → Settings** for local dev, or check spam. |
| Submission returns `Judge unreachable` | `wmoj-judge` is not running, or `NEXT_PUBLIC_JUDGE_URL` is wrong | Verify `curl http://localhost:4001/health` returns `{"status":"ok"}`. |
| Submission returns `unauthorized` from judge | `JUDGE_SHARED_SECRET` mismatch between app and judge | Both services must have the **exact same** secret string. |
| `rls policy ... already exists` when running a migration | You ran an older schema by hand first | Drop conflicting policies manually, then re-run. The baseline uses `drop policy if exists` so this should be rare. |

---

## Contributing

1. Fork the repo and create a feature branch.
2. Run through the setup steps above on your own Supabase project — never test against production.
3. Make your change. Try to keep PRs scoped (one feature/fix per PR).
4. Run `npm run lint` before pushing.
5. Open a PR against `main` describing what changed and how to test it.

If you're touching the database schema, please **add a new migration file** to `supabase/migrations/` in the same PR, so other contributors can pick up the change without you and the history stays reversible. Name it `YYYYMMDDHHMMSS_short_description.sql` using the current timestamp, put one logical change in it, and **never edit an existing migration** — corrections go in a new file on top.

Questions or stuck on setup? Open a GitHub issue or reach out via the WOSS CS Club channels.
