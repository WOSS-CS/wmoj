# wmoj-app

The WMOJ web app — an open-source competitive programming judge by the White Oaks Secondary School
CS Club. Grading is handled by a separate service, [`wmoj-judge`](https://github.com/WMOJ/wmoj-judge).

## Requirements

- Node.js 20+
- A [Supabase](https://supabase.com/dashboard) project (free tier is fine)
- `wmoj-judge` running locally — only needed to submit solutions

## Setup

**The app lives in `main/`. Run every command from there.**

```bash
git clone https://github.com/WMOJ/wmoj-app.git
cd wmoj-app/main
npm install
```

**1. Set up the database.** In your Supabase project, open **SQL Editor → New query**, paste the
contents of `supabase/migrations/20260814152742_initial_schema.sql`, and run it. If there are more
files in `supabase/migrations/`, run them too, in filename order.

**2. Configure auth.** Under **Authentication → Providers**, enable **Email**. Under **URL
Configuration**, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/**` as a
redirect URL. For local dev you can disable "Confirm email" under **Authentication → Settings** to
skip inbox round-trips.

**3. Create `main/.env.local`.** Supabase values come from **Project Settings → API**.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_JUDGE_URL=http://localhost:4001
JUDGE_SHARED_SECRET=must-match-the-judge-exactly
```

`JUDGE_SHARED_SECRET` must be byte-for-byte identical to the judge's. Never prefix it with
`NEXT_PUBLIC_` — that would leak it into the browser bundle.

**4. Start it.**

```bash
npm run dev
```

Open http://localhost:3000 and sign up.

**5. Make yourself staff.** There's no UI for this. After signing up, run in the SQL editor:

```sql
insert into public.managers (id, is_active)
select id, true from auth.users where email = 'you@example.com'
on conflict (id) do update set is_active = true;
```

Managers can do everything; swap `managers` for `admins` if you want the narrower role.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the build |
| `npm run lint` | ESLint |

## Contributing

Contributions are genuinely welcome — this project is built and maintained by high school students,
and outside help makes it better. Bug fixes, new problems, UI polish, docs, and accessibility work
are all fair game, and small PRs are perfectly good ones.

Fork it, branch off `main`, run `npm run lint` before pushing, and open a PR describing what changed
and how to test it. Changing the database? Add a new timestamped migration to `supabase/migrations/`
in the same PR rather than editing an existing one.

Not sure where to start, or stuck on setup? Open an issue — questions are welcome too.
