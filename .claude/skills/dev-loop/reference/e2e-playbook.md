# dev-loop end-to-end playbook

How this repo gets tested headlessly. Read by the main session (which provisions the kit
once per run) and by every `end-to-end` agent (which uses it).

This is a Next.js 16 app behind Supabase auth. Almost every interesting surface is
behind a login, so "end-to-end as a user experiences it" means: a real browser, a real
login form, real data. `components/**` has no unit tests by design — this is the only
place UI behaviour is ever verified.

Everything here lives in **`WORKSPACE`**, the out-of-repo scratch directory named in your
prompt. Nothing in this playbook writes to the repository.

---

## 1. The kit — provisioned once per run, by the main session

Do this at the start of Phase 4, iteration 1. Every `end-to-end` agent in every iteration
reuses it, so the Playwright download happens once and cannot race.

```bash
REPO="$(git rev-parse --show-toplevel)"
mkdir -p "$WORKSPACE/e2e-kit/specs"
ln -sfn "$REPO/node_modules" "$WORKSPACE/node_modules"      # lets WORKSPACE scripts import repo deps

cd "$WORKSPACE/e2e-kit"
npm init -y >/dev/null
npm i -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts` in `$WORKSPACE/e2e-kit`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: process.env.E2E_OUT ?? "./test-results",
  use: {
    baseURL: process.env.E2E_BASE_URL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
});
```

### Test accounts

Three accounts, one per reviewer slot, created once and torn down in Phase 5. They are real
users in the live project, so they are namespaced by run id and they only ever touch their
own rows.

`$WORKSPACE/provision-accounts.mjs`:

```js
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const runId = process.argv[2];
if (!runId) throw new Error("usage: node provision-accounts.mjs <RUN_ID>");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const accounts = [];
for (let n = 1; n <= 3; n++) {
  const email = `dev-loop+${runId}-${n}@dev-loop.test`;
  const password = `dl-${runId}-${n}-${Math.random().toString(36).slice(2, 12)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`account ${n}: ${error.message}`);
  accounts.push({ n, id: data.user.id, email, password });
}
writeFileSync(
  new URL("./accounts.json", import.meta.url),
  JSON.stringify(accounts, null, 2),
);
console.log(`provisioned ${accounts.length} accounts`);
```

```bash
node --env-file="$REPO/.env.local" "$WORKSPACE/provision-accounts.mjs" "$RUN_ID"
```

If `@dev-loop.test` is rejected, retry with `@example.com`. If provisioning fails entirely,
say so — Phase 4 still runs, but every `end-to-end` agent reports the authenticated surface
as **blocked**, never as passing.

`accounts.json` contains passwords. It never enters the repo, never enters a report, and is
deleted in Phase 5.

## 2. One app instance per `end-to-end` agent

Three agents run concurrently. They cannot share a `.next` directory or a port, so each gets
its own copy of the working tree. The copy is byte-identical to the tree under review —
Phase 4 has no concurrent writers.

```bash
PORT=$(( 3200 + (ITERATION - 1) * 10 + REVIEWER_INDEX ))   # 3201-3205, 3211-3215, …
APP="$WORKSPACE/app-$ITERATION-$REVIEWER_INDEX"

rsync -a \
  --exclude .git --exclude node_modules --exclude .next --exclude .dev-loop \
  "$REPO/" "$APP/"
ln -sfn "$REPO/node_modules" "$APP/node_modules"

cd "$APP"
./node_modules/.bin/next dev -p "$PORT" > "$APP/server.log" 2>&1 &
echo $! > "$APP/server.pid"
```

Never use port 3000 and never reuse a server you did not start — the user's own dev server
may be on a different branch entirely.

### Readiness, with a positive control

`next dev` compiles on first request, so allow real time. And prove the probe can tell a
live server from a dead one before trusting a 200:

```bash
BASE="http://127.0.0.1:$PORT"
for i in $(seq 1 120); do
  curl -fsS -o /dev/null "$BASE/" && break
  sleep 2
done

home=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
bogus=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/__dev_loop_no_such_route__")
# home must be 200 AND bogus must be 404. If both are 200, or the loop timed out,
# the probe is not measuring anything: tail server.log and report BLOCKED.
```

A server that never came up is a **blocked** result with the last 50 lines of `server.log`
attached. It is never a pass, and it is never silence.

## 3. Writing the spec

One spec file per agent: `$WORKSPACE/e2e-kit/specs/iter<K>-reviewer<N>.spec.ts`. Run it:

```bash
cd "$WORKSPACE/e2e-kit"
E2E_BASE_URL="http://127.0.0.1:$PORT" \
E2E_OUT="$WORKSPACE/e2e-kit/results/iter$ITERATION-r$REVIEWER_INDEX" \
E2E_EMAIL="…" E2E_PASSWORD="…" \
  ./node_modules/.bin/playwright test "specs/iter$ITERATION-reviewer$REVIEWER_INDEX.spec.ts" \
  --workers=1 --reporter=list
```

**Discover the app, do not assume it.** Routes and selectors change; this playbook is not a
selector reference. Locate the sign-in page and the authenticated shell in the Phase 0
codebase map, read those files, then write selectors against what is actually there. Prefer
role- and label-based locators over CSS.

Sign-in shape (find it in the current code before relying on it): a sign-in route takes an
email and a password and lands on the authenticated shell. Assert on something only an
authenticated user can see — reaching that route without an error is not proof.

**Always attach the two listeners.** They catch defects no assertion was written for, on
every page the spec visits:

```ts
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => pageErrors.push(String(e)));
```

Report every entry. A clean run with three console errors is not a clean run.

### What to cover

1. **The change itself** — the acceptance criteria in `plan.md`, exercised the way a user
   would reach them. If the task was a bug fix, reproduce the original symptom first and
   show it is gone.
2. **A regression sweep of the core product**, every iteration, not just the first: sign-up
   or sign-in; the primary authenticated surface loads; create / edit / delete the app's main
   object; the change survives a reload; navigation across the app shell; settings; the public
   marketing and legal pages render; a bogus URL 404s rather than 500s.
3. **The pixel layer.** Look at the screenshots. Overlapping text, clipped controls,
   misaligned rows, a scrollbar that should not exist, a dark-mode contrast failure — if it
   clearly looks wrong, it is a finding. Say which screenshot shows it.

## 4. Teardown — yours, every time

```bash
kill "$(cat "$APP/server.pid")" 2>/dev/null || true
sleep 2
kill -9 "$(cat "$APP/server.pid")" 2>/dev/null || true
rm -rf "$APP"
```

Keep the spec, the results directory, and any failure screenshot — your report cites them by
absolute path. The main session removes the whole `WORKSPACE` in Phase 5.

## 5. Data safety

The account is real and the database is production.

- Create only what you need, under your own account. Delete the rows you created.
- Never touch a row you did not create, never run an unqualified `DELETE`/`UPDATE`, never
  exercise a destructive admin path against another user's data.
- Do not connect a third-party OAuth integration, do not start a payment checkout against
  live keys, and do not send email. If a flow cannot be tested without one of those, report it
  as **not covered** and say why.
- Never echo an account password, a session token, or any `.env.local` value into a report.
