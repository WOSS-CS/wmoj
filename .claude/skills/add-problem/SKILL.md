---
name: add-problem
description: Add competitive-programming problems to WMOJ, one at a time or a whole folder in bulk, from any source format (PDF, Markdown, plain text, images). Writes the statement, authors a generator.cpp in the house style, produces the test data by running that generator on the live judge, verifies the whole problem end to end against the live judge, and inserts it directly into the Supabase database as an active problem. Use whenever someone wants to upload, add, publish, or bulk-import problems onto WMOJ.
---

# Adding problems to WMOJ

Take problem material in whatever form it arrives, turn it into a complete WMOJ problem, prove it
works against the deployed judge, and write it into the live database as an active problem.

Two rules govern everything below, and neither has an exception:

1. **Problems are published by inserting directly into the Supabase database via the Supabase MCP.**
   Never through the admin or manager UI, never through the app's API routes, never through a local
   or branched Supabase, never by writing a migration file.
2. **Every verification runs against the live judge at `NEXT_PUBLIC_JUDGE_URL`
   (`https://wmoj-judge.onrender.com`).** Never build, run, `docker run`, or otherwise host
   `wmoj-judge` locally to test a problem. A local judge has a real CPU and real memory; passing
   there proves nothing about the machine that will actually grade submissions.

## Preflight — check these before touching anything

Run all three. If any fails, **stop and tell the user what failed**. Do not work around it, and do
not fall back to another way of publishing.

**1. The Supabase MCP is connected to the right project.** Call `list_projects` and confirm a
project named **WMOJ**, ref **`usltyqkrptaaktnmjeyf`**, status `ACTIVE_HEALTHY`. Then prove it can
actually read:

```sql
select count(*) as problems from public.problems;
```

If `list_projects` errors, returns nothing, or does not contain that ref — or if the query fails —
say so plainly:

> The Supabase MCP server isn't reachable / isn't connected to the WMOJ project
> (`usltyqkrptaaktnmjeyf`). Publishing a problem any other way isn't something I'll do, so I've
> stopped here. Can you check the MCP connection?

Same if the MCP is connected but to a *different* project. Never guess which project is right, and
never write problem data into one that is not WMOJ.

**2. The live judge is up.**

```bash
.claude/skills/add-problem/scripts/judge.sh health
```

It is a free Render instance and spins down when idle, so the first request after a quiet period can
take 30–60 seconds. That is normal. A non-200 after it has had time to wake up is not.

**3. Credentials resolve.** `judge.sh` reads `NEXT_PUBLIC_JUDGE_URL` and `JUDGE_SHARED_SECRET` from
`main/.env.local`. If that file is missing, ask the user for it rather than inventing values. If
`NEXT_PUBLIC_JUDGE_URL` points at localhost, the script refuses — ask the user to point it at the
Render URL.

## The budget — size everything for a 512 MB, 0.1-CPU box

This is the constraint that shapes every decision in this workflow, and the one most likely to be
forgotten halfway through. The judge runs on a **free Render instance: 512 MB of RAM and roughly a
tenth of a CPU**, in an unprivileged container, running test cases **serially**.

Hard caps, enforced by the judge with a 413 before anything compiles:

| Limit | Value |
|---|---|
| Test cases per problem | 200 |
| Bytes per single input | 1 MB |
| Bytes per single expected output | 1 MB |
| Submitted source | 100 KB |

What you should actually target, taken from the problems on WMOJ that work today:

| | Target | Ceiling seen in working problems |
|---|---|---|
| Cases | 15–50 | 65 |
| Largest single case | under 150 KB | 117 KB |
| Total input + output | under 1.5 MB | 1.2 MB |
| `memory_limit` | 256 MB | 512 MB — never higher |
| `time_limit` | 1000–2000 ms | 3000 ms |

WMOJ deliberately ships fewer and smaller test cases than other sites hosting the same problems.
Cover the interesting edge cases well; do not try to be exhaustive. A problem whose largest case
exceeds 1 MB is not "slow", it is **permanently unsubmittable** — the judge rejects the payload
before it compiles anything. Two problems already on the site are in exactly that state
(`WOSS TriOlympiad: S2` at 1,477,908 bytes and `WOSS TriOlympiad: J3` at 1,001,009 bytes), and both
have zero submissions as a result.

Two more consequences of that host worth holding on to:

- **TLE is decided from CPU time**, with a wall-clock backstop at 3× the limit. Verdicts stay stable
  on a shared vCPU, but a solution that only just fits will start failing when the host is busy.
  Aim for a reference solution that uses well under half the time limit.
- **`memory_limit` above 512 MB cannot be enforced** — it exceeds the whole machine. Six existing
  problems declare 1024 MB; treat that as a bug to avoid, not a precedent.

## Pipeline

Run this in full, per problem, in order. Later steps depend on earlier ones having actually passed.

**1. Read the source.** PDFs go through the Read tool with a `pages` range; Markdown, text, and
images likewise. Pull out the title (contest prefix included), the statement, the input and output
specifications, the constraints, every sample, the marks/subtask breakdown if there is one, and the
official time and memory limits if stated. If the source is a scan or has figures you cannot read,
say which parts you could not extract rather than inventing them.

**2. Write the statement.** See `reference/statement-format.md` for the required shape, the
Markdown quirks, and how to pick `id`, `points`, `time_limit`, and `memory_limit`.

**3. Write `generator.cpp`.** See `reference/generator-style.md`. The house style is specific and
non-optional: the fixed RNG seed `123456789`, the verbatim `json_escape` helper, the section
banners, samples verbatim first. Work out the byte budget *before* writing it — capping `N` so a
case stays under ~150 KB is a decision made in the generator, not discovered afterwards.

**4. Write a reference solution.** A separate file, not stored in the database. This is what proves
the generated expected outputs are actually correct. Prefer C++ (`cpp17`) so its runtime is
comparable to what students will submit.

**5. Generate the test data on the live judge.**

```bash
.claude/skills/add-problem/scripts/judge.sh generate generator.cpp tests.json
```

This is the **only** way test data gets produced. Not by running the generator locally, not by
writing arrays by hand. Two reasons: it proves the generator compiles and runs inside the Render
sandbox, which is exactly what a manager re-running it later depends on; and `bits/stdc++.h` does
not exist under Apple clang, so a generator that builds on the dev machine says nothing anyway.

The command prints the case count and byte sizes and fails if any cap is breached. If the generator
fails to compile or its output will not parse, the judge returns the raw stdout and stderr — fix the
generator and re-run. Never hand-edit `tests.json` to make it pass; the stored generator has to
reproduce the stored data exactly.

**6. Verify against the live judge.**

```bash
.claude/skills/add-problem/scripts/judge.sh submit solution.cpp cpp17 tests.json <timeLimitMs> <memLimitMb>
```

The reference solution must pass **every** case. Anything less means the generator's expected
outputs are wrong, and the problem is not ready. The command also reports the slowest case — if it
is anywhere near the time limit, either raise the limit or shrink the cases, because the host will
be slower on a bad day.

Then confirm the tests actually discriminate: submit a deliberately wrong solution (an off-by-one,
a brute force that ignores an edge case) and check it *fails*. A test set that everything passes is
not a test set.

**7. Insert into Supabase.** See `reference/database.md` for the column reference, the dollar-quoted
insert, and the escaping traps. `is_active` is `true` — the ask is a visible, active problem. Store
`generator_file` in the same insert; a problem published without its generator is half-published.

**8. Verify the write end to end.** Read the row back with the verification query in
`reference/database.md`, then pull the arrays *as stored in the database* and run the reference
solution against them one more time:

```bash
.claude/skills/add-problem/scripts/judge.sh submit solution.cpp cpp17 stored-tests.json <tl> <ml>
```

This is the step that catches escaping damage on the round trip through `jsonb`, and it is the only
run that tests the exact bytes a student's submission will be graded against. It must be 100% AC.
`reference/database.md` shows how to pull the stored arrays into a file without reading them, and
how to confirm the stored generator still reproduces the stored data exactly.

**9. Report.** Give the user the problem id, title, points, limits, case count, total payload size,
and the verdict summary from step 8. If anything is left for them to do by hand — a missing figure,
a judgement call on points — say it explicitly.

## No migration file for this

Publishing a problem does **not** get an entry in `supabase/migrations/`, even though it goes
through the Supabase MCP. The repo's `AGENTS.md` requires a new migration for anything that alters
the database's *structure or behaviour* — tables, columns, constraints, indexes, RLS policies,
functions, triggers, RPCs, enums, extensions, storage. Adding a problem is none of those. It is a
row of content in an existing table, exactly like a news post or a contest, and rows are not what
the migration history is for. Logging them there would bury the schema changes that actually need
to be traceable and reversible.

The same goes for the rest of this workflow: flipping `is_active`, correcting a statement,
regenerating test data, or deleting a problem you just added. All rows, no migrations.

If publishing a problem ever seems to *require* a schema change, stop — that is a real migration
and a separate conversation with the user.

## Bulk mode

When given a folder, run the full pipeline for **one problem at a time, start to finish**. Do not
batch: do not generate all the test sets and then insert them all, because a failure halfway leaves
the database in a state nobody can reason about.

- Read the folder first and confirm the list of problems with the user before starting, including
  the `id` you intend to use for each. Slug collisions are much cheaper to fix now.
- The judge rate-limits to 60 requests per minute shared across `/submit` and `/generate-tests`, and
  every request from this app shares one bucket. Two to four calls per problem means a large batch
  needs pacing, not parallelism. Run them serially.
- If one problem fails, leave it out, keep going with the rest, and collect the failures. Report at
  the end which were published and which were not, with the specific reason for each.
- Track progress with the task tools for anything over a handful of problems, so the state survives
  a long run.

## Never

- Never run or host `wmoj-judge` locally to test a problem.
- Never publish through the UI, the app's API routes, or anything other than a direct database
  insert via the Supabase MCP.
- Never proceed when the Supabase MCP is down or pointed at the wrong project — stop and tell the
  user.
- Never store test data the live judge did not produce from the stored generator.
- Never mark a problem active before step 8 passes.
- Never insert a submission row to "test" a problem. Submissions feed points, solve counts, and
  leaderboards; verification goes straight to the judge and leaves no trace.
- Never invent a `created_by` UUID, a figure you could not read, or a constraint the source did not
  state.

---

**Keeping this current:** if you find anything here that is outdated, stale, wrong, or missing —
a changed judge contract, a new column, a shifted cap, a style rule the existing generators no
longer follow, or something you had to work out the hard way — update it as part of your change.
This skill is only useful while it is accurate.
