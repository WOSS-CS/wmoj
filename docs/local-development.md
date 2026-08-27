# Local development

Run the whole of WMOJ on your machine. The Supabase CLI brings up Postgres, Auth and Storage in
Docker, and `supabase/migrations/` replays into a database with production's exact schema and no
data. You do not need a Supabase account.

## Requirements

- Node.js 20.9+
- Docker, running
- The Supabase CLI

```bash
brew install supabase/tap/supabase
```

Not on macOS? See [the install
guide](https://supabase.com/docs/guides/local-development/cli/getting-started). `npx supabase` works
too if you would rather not install anything.

## Start the stack

From the repo root, not `main/`:

```bash
PGOPTIONS="-c check_function_bodies=off" supabase start
```

First run pulls about 1 GB of images. After that it takes ~25 seconds.

**That `PGOPTIONS` prefix is required on any command that applies migrations** (`supabase start`,
`supabase db reset`). The baseline migration defines two SQL helper functions above the tables they
query, and Postgres checks a SQL function body the moment you create it, so a cold apply fails with
`relation "public.admins" does not exist`. `PGOPTIONS` defers that check, which is the same thing
`pg_dump` writes at the top of every dump file. Production never hit this because its baseline was
squashed from a database that already had the tables.

`supabase start` prints your local URLs and keys. `supabase status` reprints them. They are fixed
development values, the same on every machine.

| Service | URL |
|---|---|
| API | http://127.0.0.1:54321 |
| Database | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (table + SQL editor) | http://127.0.0.1:54323 |
| Mailpit (catches all auth email) | http://127.0.0.1:54324 |

## Point the app at it

Write `main/.env.local` from the running stack, so you never copy a key by hand. Run this from the
repo root:

```bash
eval "$(supabase status -o env)"
cat > main/.env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=$SECRET_KEY
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_JUDGE_URL=http://localhost:4001
JUDGE_SHARED_SECRET=local-dev-secret
EOF
```

`supabase status` prints the same values if you would rather read them. They are fixed development
values, identical on every machine, but keep them out of anything git tracks. GitHub push protection
recognises the `sb_secret_` prefix and rejects the push.

`SUPABASE_SECRET_KEY` is required. The graded test data lives in the staff-only `problem_tests`
table and only the service-role client can read it, so leave it out and nothing grades.

Then:

```bash
cd main
npm install
npm run dev
```

## Make yourself staff

Sign up at http://localhost:3000/auth/signup. Email confirmation is off locally, so you are signed
in straight away. Then run this in Studio's SQL editor (http://127.0.0.1:54323), or from a terminal:

```bash
docker exec -i supabase_db_wmoj-app psql -U postgres -d postgres -c \
  "insert into public.managers (id, is_active)
   select id, true from auth.users where email = 'you@example.com'
   on conflict (id) do update set is_active = true;"
```

Reload the page and the manager tools appear. Managers can do everything. Swap `managers` for
`admins` if you want the narrower role.

## Verify the schema matches production

`supabase/schema-fingerprint.sql` counts and hashes every column, policy, function, trigger, index,
constraint, grant and storage bucket, and compares against values recorded from production.

```bash
docker exec -i supabase_db_wmoj-app psql -U postgres -d postgres \
  -f - < supabase/schema-fingerprint.sql
```

All eight rows should report `count_ok = t`. If one does not, a migration failed to apply: re-run
`supabase db reset` with the `PGOPTIONS` prefix and read the output.

`functions` reports `md5_ok = f`. That one is expected and harmless (details in the file's header).
Everything else should be `t`.

## Reset and stop

```bash
PGOPTIONS="-c check_function_bodies=off" supabase db reset   # wipe and replay every migration
supabase stop                                                # stop, keep the data
supabase stop --no-backup                                    # stop, throw the data away
```

After pulling new migrations, run `db reset`. Replaying from scratch is the only real check that the
history still applies cleanly.

Adding a migration? Write a new timestamped file in `supabase/migrations/`, never edit an existing
one, then `db reset` and re-run the fingerprint. Update the expected values in
`schema-fingerprint.sql` in the same PR.

## What is turned off

`supabase/config.toml` is tuned to run only what the app uses: 8 containers and about 640 MB instead
of 12 and 1.5 GB. Realtime, edge functions, analytics, the S3 protocol and vector buckets are off,
because nothing in `main/src` touches any of them.

Two things follow from that. `supabase logs` needs analytics back on, so use `docker logs
supabase_db_wmoj-app` (or `_auth_`, `_rest_`, `_storage_`) instead. And if you genuinely need a
disabled service, turn it on in `config.toml` and say why in your PR.

Auth is configured there too, so there is nothing to click: email sign-in on, site URL
`http://localhost:3000`, redirects allow-listed, email confirmation off, and the mail rate limit
raised so password resets are testable.

## Grading

Submissions need [`wmoj-judge`](https://github.com/WMOJ/wmoj-judge) running and reachable at
`NEXT_PUBLIC_JUDGE_URL`. Without it everything else works, but submitting fails and `/status` shows
the judge down. That is expected.

## Troubleshooting

**`relation "public.admins" does not exist`** on start or reset. You dropped the `PGOPTIONS` prefix.

**Port already in use.** Something else holds 54321-54324. Stop it, or change the ports in
`config.toml`.

**The app shows production data.** Your shell or `.env.local` still points at the hosted project.
Check with `curl -s http://localhost:3000/problems | grep -c '127.0.0.1:54321'`.

**Signup fails with a rate-limit message.** Auth rate limits are per 5 minutes. Wait, or raise the
numbers under `[auth.rate_limit]` in `config.toml` and restart.

**Docker runs out of memory.** Give Docker Desktop more RAM, or set `[studio] enabled = false` in
`config.toml` to drop ~300 MB.
