# wmoj-app

The WMOJ web app, an open-source competitive programming judge by the White Oaks Secondary School CS
Club. Grading is handled by a separate service, [`wmoj-judge`](https://github.com/WMOJ/wmoj-judge).

## Requirements

- Node.js 20.9+
- Docker, running (for the local Supabase stack)
- The [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):
  `brew install supabase/tap/supabase`

## Setup

**The app lives in `main/`. Run every npm command from there.**

```bash
git clone https://github.com/WMOJ/wmoj-app.git
cd wmoj-app

# Postgres, Auth and Storage in Docker, with production's exact schema and no data.
PGOPTIONS="-c check_function_bodies=off" supabase start

cd main
npm install
```

`supabase start` prints your local API URL and keys. Put them in `main/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_JUDGE_URL=http://localhost:4001
JUDGE_SHARED_SECRET=local-dev-secret
```

`SUPABASE_SECRET_KEY` is the service-role key from the same output. It is required: the graded test
data lives in a staff-only table that only that key can read, so without it nothing grades. Never
give it, or `JUDGE_SHARED_SECRET`, a `NEXT_PUBLIC_` prefix. That would ship it to the browser.

`JUDGE_SHARED_SECRET` must be byte-for-byte identical to the judge's.

```bash
npm run dev
```

Open http://localhost:3000 and sign up. Then make yourself staff (there is no UI for it):

```bash
docker exec -i supabase_db_wmoj-app psql -U postgres -d postgres -c \
  "insert into public.managers (id, is_active)
   select id, true from auth.users where email = 'you@example.com'
   on conflict (id) do update set is_active = true;"
```

Reload, and the manager tools appear.

**[docs/local-development.md](docs/local-development.md)** covers the rest: what that `PGOPTIONS`
prefix is for, verifying your schema matches production, resetting the database, which Supabase
services are switched off and why, and troubleshooting.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the build |
| `npm run lint` | ESLint |
| `npm test` | `node --test` via tsx over `src/**/*.test.ts` |
| `npm run gen:types` | Regenerate `src/types/database.types.ts` from the local Supabase stack |

## Contributing

Contributions are genuinely welcome. This project is built and maintained by high school students,
and outside help makes it better. Bug fixes, new problems, UI polish, docs and accessibility work are
all fair game, and small PRs are perfectly good ones.

Fork it, branch off `main`, run `npm run lint` before pushing, and open a PR describing what changed
and how to test it. Changing the database? Add a new timestamped migration to `supabase/migrations/`
in the same PR rather than editing an existing one.

Not sure where to start, or stuck on setup? Open an issue. Questions are welcome too.
