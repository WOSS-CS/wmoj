---
name: local-dev
description: Stand up the whole WMOJ stack on this machine — install the Supabase CLI, start the local Postgres/Auth/Storage containers, replay every migration so the local schema is a 1:1 match for production, point the Next.js app at it, and bootstrap a staff account. Covers config.toml, schema-parity verification, resetting, and what cannot be tested locally. Use whenever someone wants to run, develop against, debug, or test wmoj-app locally, set up a local or offline database, reproduce a bug outside production, or onboard as a contributor without Supabase credentials.
---

# Running WMOJ locally

Bring up a local Supabase stack whose schema is **identical to production** — same tables, columns,
RLS policies, RPCs, triggers, indexes, constraints, grants and storage buckets — with empty tables,
then run the Next.js app against it.

Assume the person you are helping has **no access to the live Supabase project and no Supabase MCP
server**. Everything below works from this repository, Docker and a laptop. Never tell them to create
a hosted Supabase project, and never reach for the MCP to fill a gap — if something only works with
production access, say so instead of routing around it.

## Preflight

1. **Docker must be running.** `docker info` has to succeed. The stack is 8 containers.
2. **The repo already has `supabase/config.toml`.** Do **not** run `supabase init` — it would
   overwrite a deliberately tuned file. If `config.toml` is missing, something is wrong with the
   checkout; say so rather than regenerating it.
3. Node ≥20.9, and `main/node_modules` installed (`cd main && npm install`).

## The one thing that will bite you

`supabase/migrations/20260814152742_initial_schema.sql` is a squashed baseline that **does not replay
on an empty database**. It defines the `language sql` helpers `public.is_admin()` and
`public.is_manager()` in section 2, above the `create table` for `public.admins` and
`public.managers` in section 4. Postgres validates a `language sql` body at `create function` time,
so a cold apply dies with:

```
ERROR: relation "public.admins" does not exist (SQLSTATE 42P01)
```

Production never hit this because the baseline was squashed from a database that already had the
tables; it has never actually been replayed there.

**Every command that applies migrations must therefore carry `PGOPTIONS`:**

```bash
PGOPTIONS="-c check_function_bodies=off" supabase start
PGOPTIONS="-c check_function_bodies=off" supabase db reset
```

That is what `pg_dump` puts at the top of every dump file (`SET check_function_bodies = false;`) for
exactly this reason: a restore recreates objects in an order that can forward-reference. With it set,
all 17 migrations replay cleanly and the result matches production.

`supabase/config.toml` cannot express this and neither can `supabase/roles.sql` — the CLI runs
roles.sql on the *same* session it then applies migrations on, so `alter role … set` lands too late,
and it drops bare `set` statements. The env var is the only lever. **The real fix is to move the two
helper functions below the `create table` statements in the baseline**, which needs a maintainer's
sign-off because migration history is append-only here. Until that happens, keep the prefix.

## Install and start

```bash
brew install supabase/tap/supabase          # macOS; see docs/local-development.md for other OSes
cd <repo root>                              # NOT main/ — supabase/ lives at the root
PGOPTIONS="-c check_function_bodies=off" supabase start
```

First run pulls ~1 GB of images and takes a few minutes; later starts take about 25 seconds. It
prints `API_URL`, `PUBLISHABLE_KEY` and `SECRET_KEY`; `supabase status` reprints them.

The URLs are fixed. The keys are the CLI's fixed local development values too, identical on every
machine, but **do not paste them into a tracked file** — GitHub push protection recognises the
`sb_secret_` prefix and will reject the push. Read them at runtime instead:

```bash
supabase status            # human-readable
supabase status -o env     # KEY="value" lines, safe to eval
```

| | |
|---|---|
| API URL | `http://127.0.0.1:54321` |
| Publishable key | `$PUBLISHABLE_KEY` from `supabase status -o env` |
| Secret key | `$SECRET_KEY` from `supabase status -o env` |
| Database | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio | `http://127.0.0.1:54323` |
| Mailpit | `http://127.0.0.1:54324` |

## Point the app at it

`main/.env.local` is gitignored and may already hold **real production credentials**. Never edit it
without backing it up first, and never print its values. For a one-off run, pass the values inline
instead — shell env wins over `.env.local` in Next.js:

```bash
eval "$(supabase status -o env)"
cd main
NEXT_PUBLIC_SUPABASE_URL="$API_URL" \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
SUPABASE_SECRET_KEY="$SECRET_KEY" \
NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
NEXT_PUBLIC_JUDGE_URL=http://localhost:4001 \
JUDGE_SHARED_SECRET=local-dev-secret \
npm run dev
```

`eval` from the repo root, then `cd main`. Confirm the app is really on the local stack before
trusting anything you see: `curl -s http://localhost:3000/problems | grep -c '127.0.0.1:54321'`.

**`SUPABASE_SECRET_KEY` is required, not optional.** The graded test data lives in the staff-only
`problem_tests` table and only the service-role client (`lib/supabaseAdmin.ts`) can read it. Without
it nothing grades and problem pages show an unknown test-case count.

Before concluding anything about a run, **confirm which database you actually hit** — a stale
`.env.local` silently pointing at production is the failure mode that matters:

```bash
curl -s http://localhost:3000/problems | grep -c '127.0.0.1:54321'
```

## Verify schema parity

Run this after every reset. It is the whole point of the local stack.

```bash
docker exec -i supabase_db_wmoj-app psql -U postgres -d postgres -f - < supabase/schema-fingerprint.sql
```

Expected: `count_ok = t` on all eight rows, `md5_ok = t` on seven.

| category | count | md5 |
|---|---|---|
| columns | 96 | match |
| policies | 65 | match |
| **functions** | 13 | **known mismatch, benign** |
| triggers | 10 | match |
| indexes | 44 | match |
| constraints | 47 | match |
| grants | 281 | match |
| buckets | 2 | match |

**A `count_ok = f` is a real defect** — a migration did not apply. Re-run `db reset` with `PGOPTIONS`
and read the output.

The `functions` md5 mismatch is expected and understood: five bodies differ from production in
keyword case, one stray space and one SQL comment, plus `::text` casts the repo added to
`join_contest` and `leave_contest`. Those two are dead code with no caller in `main/src`, and
production is the side that drifted — `contest_participants.contest_id` is `text` while the
parameter is `uuid`, so production's version would raise `operator does not exist: text = uuid` if
anything ever called it. Do not "fix" local to match production here.

## Bootstrap a staff account

Sign up through the UI at http://localhost:3000/auth/signup (email confirmation is off, so you are
signed in immediately), then promote:

```bash
docker exec -i supabase_db_wmoj-app psql -U postgres -d postgres -c \
  "insert into public.managers (id, is_active)
   select id, true from auth.users where email = 'you@example.com'
   on conflict (id) do update set is_active = true;"
```

Reload the page: the SSR guards in `lib/staffAuth.ts` query the table on every request, and
`AuthContext` re-resolves the role on each page load. Swap `managers` for `admins` for the narrower
role. Manager > admin > regular.

## Reset, stop, resync

```bash
PGOPTIONS="-c check_function_bodies=off" supabase db reset   # drop, replay all migrations, empty tables
cd main && npm run gen:types                                 # regenerate src/types/database.types.ts
supabase stop                                                # keep the data volume
supabase stop --no-backup                                    # throw the database away
```

After pulling new migrations, `db reset` rather than `supabase migration up`: replaying from scratch
is the only honest check that the history still applies to an empty database. Then
`cd main && npm run gen:types` and commit `src/types/database.types.ts` if it changed — all three
Supabase clients carry the `Database` generic, so a stale generated file silently type-checks
queries against a schema that no longer exists.

**Do not create migrations to make local work.** Local and production diverging is a bug in the
migrations, not something to paper over with a local-only file. Report it instead.

## What `config.toml` turns off, and why

Realtime, edge runtime and analytics/Logflare are disabled, along with the S3 protocol and vector
buckets. Nothing in `main/src` opens a `.channel()`, there is no `supabase/functions/` directory or
`functions.invoke()` call, and nothing reads the log pipeline. That takes the stack from 12
containers / ~1.5 GB to 8 containers / ~640 MB.

Consequences worth knowing:

- **`supabase logs` does not work** with analytics off. Use `docker logs supabase_auth_wmoj-app`,
  `supabase_rest_wmoj-app`, `supabase_db_wmoj-app`, `supabase_storage_wmoj-app`.
- Postgres, Auth, PostgREST, Storage, Studio and Mailpit stay on. Mailpit is what makes
  `/auth/forgot-password` testable; auth mail lands at http://127.0.0.1:54324.
- **If you need a disabled service, flip it in `config.toml` and say why in the PR.** Do not enable
  one silently to make a test pass.

Auth is configured in `config.toml`, not by clicking around a dashboard: email provider on, site URL
`http://localhost:3000`, `http://localhost:3000/**` allow-listed for redirects, email confirmation
off, and the mail rate limit raised from 2/hour so password reset is actually testable.

## What you cannot verify locally

**Grading.** It needs `wmoj-judge` running and reachable at `NEXT_PUBLIC_JUDGE_URL`. Everything up to
the submit call works; the `fetch` to the judge fails and the route surfaces the error. `/status` will
show the judge down. That is expected, not a broken local setup. Say so plainly rather than
implying a submission was graded.

Publishing real problems is the `add-problem` skill's job and runs against the **live** judge and the
**live** database. Never publish problems into a local stack and call it done.
