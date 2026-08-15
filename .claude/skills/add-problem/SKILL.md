---
name: add-problem
description: Add competitive-programming problems to WMOJ, one at a time or a whole folder in bulk, from any source format (PDF, Markdown, plain text, images). Writes the statement, authors a generator.cpp in the house style, produces the test data by running that generator on the live judge, verifies the whole problem end to end against the live judge, and inserts it directly into the Supabase database as an active problem. Use whenever someone wants to upload, add, publish, or bulk-import problems onto WMOJ.
---

# Adding problems to WMOJ

Take problem material in whatever form it arrives, turn it into a complete WMOJ problem, prove it
works against the deployed judge, and write it into the live database as an active problem.

Three rules govern everything below, and none has an exception:

1. **Problems are published by inserting directly into the Supabase database via the Supabase MCP.**
   Never through the admin or manager UI, never through the app's API routes, never through a local
   or branched Supabase, never by writing a migration file.
2. **Every verification runs against the live judge at `NEXT_PUBLIC_JUDGE_URL`
   (`https://wmoj-judge.onrender.com`).** Never build, run, `docker run`, or otherwise host
   `wmoj-judge` locally to test a problem. A local judge has a real CPU and real memory; passing
   there proves nothing about the machine that will actually grade submissions.
3. **Every judge call goes through `scripts/judge-lock.sh`, not `judge.sh` directly.** It takes
   identical arguments and holds a mutex, so parallel agents never hit the judge at once. The judge
   is one 512 MB / ~0.1-CPU box running cases serially: concurrent jobs corrupt each other's verdicts
   — a correct solution trips the 3× wall-clock backstop as TLE, an OOM-killed `g++` comes back as a
   compile error — and the "fix" for either (padded time limit, shrunken data) is stored permanently.
   It costs no throughput; `health` and `check` pass straight through.

## Preflight — check these before touching anything

Run all three. If any fails, **stop and tell the user what failed**. Do not work around it, and do
not fall back to another way of publishing.

**1. The Supabase MCP is connected to the right project.** Call `list_projects` and confirm a project
named **WMOJ**, ref **`usltyqkrptaaktnmjeyf`**, status `ACTIVE_HEALTHY`, then prove it can actually
read with `select count(*) from public.problems;`. If that errors, returns nothing, lacks that ref,
is pointed at a *different* project, or the query fails, say so plainly:

> The Supabase MCP server isn't reachable / isn't connected to the WMOJ project
> (`usltyqkrptaaktnmjeyf`). Publishing a problem any other way isn't something I'll do, so I've
> stopped here. Can you check the MCP connection?

Never guess which project is right, and never write problem data into one that is not WMOJ.

**2. The live judge is up.**

```bash
.claude/skills/add-problem/scripts/judge-lock.sh health
```

It is a free Render instance and spins down when idle, so the first request after a quiet period can
take 30–60 seconds. That is normal. A non-200 after it has had time to wake up is not.

**3. Credentials resolve.** `judge.sh`, which `judge-lock.sh` forwards to, reads
`NEXT_PUBLIC_JUDGE_URL` and `JUDGE_SHARED_SECRET` from `main/.env.local`. If that file is missing,
ask the user for it rather than inventing values. If `NEXT_PUBLIC_JUDGE_URL` points at localhost, the
script refuses — ask the user to point it at the Render URL.

## The budget — size everything for a 512 MB, 0.1-CPU box

This is the constraint that shapes every decision in this workflow, and the one most likely to be
forgotten halfway through. The judge is a **free Render instance: 512 MB of RAM and roughly a tenth
of a CPU**, in an unprivileged container, running test cases **serially**.

Hard caps, enforced by the judge with a 413 before anything compiles: **200 cases** per problem,
**1 MB** per single input, **1 MB** per single expected output, 100 KB of submitted source, 100 KB
of checker source.

What you should actually target, against the 50 CCC problems already published through this skill —
the cohort to copy:

| | Target | Seen across the CCC cohort |
|---|---|---|
| Cases | 15–50 | 15–55, averaging 25 |
| Largest single case | under 150 KB | 119 KB |
| Total input + output | under 1.5 MB | 583 KB |
| `time_limit` | 1000–2000 ms | 1000–3000 ms |
| `memory_limit` | 256 MB | 256 MB throughout |

WMOJ deliberately ships fewer and smaller test cases than other sites hosting the same problems:
cover the interesting edge cases well, do not try to be exhaustive. A problem whose largest case
exceeds 1 MB is not "slow", it is **permanently unsubmittable** — the judge rejects the payload before
compiling anything. Two legacy problems are in that state (`WOSS TriOlympiad: S2` at 1,477,908 bytes,
`WOSS TriOlympiad: J3` at 1,001,009) and both have zero submissions as a result.

Three more consequences of that host worth holding on to:

- **TLE is decided from CPU time**, with a wall-clock backstop at 3× the limit. Verdicts stay stable
  on a shared vCPU, but a solution that only just fits will start failing when the host is busy.
  Aim for a reference solution that uses well under half the time limit.
- **Allocation is punished disproportionately here.** One reference solution went 2296 ms → 187 ms
  (12×) purely by replacing per-call hash maps with an allocation-free algorithm, output
  byte-identical. Look at allocation before you reach for a bigger `time_limit`.
- **`memory_limit` may name the source contest's real limit, above 512 included** — the judge
  enforces `min(declared, 512)` and reports `effectiveMemoryLimitMb`. But when the problem is
  genuinely solvable in 512 MB or less, which is nearly always, store 512 or lower rather than an
  inflated number. 256 is the default and right for almost everything; no live problem exceeds 512.

## Problems whose answer is not unique — write a checker

Byte comparison rejects correct solutions whenever more than one answer is valid ("print any shortest
path", "any valid arrangement", a floating-point tolerance). Such problems used to be unpublishable
here; they are not any more. Put C++ checker source in `problems.checker` and the judge grades with
it instead of comparing bytes. `NULL`/empty means byte comparison — what nearly every problem should
use, so reach for a checker only when the answer really is not unique.

The judge compiles it once per submission and runs it per case as
`checker <input_file> <expected_answer_file> <contestant_output_file>`, sandboxed with 10 s / 256 MB.
Testlib exit codes: **`0`** accepted, **`1`** wrong answer, **`2`** presentation error (graded WA),
**`3`** checker internal error — meaning *your* problem or test data is broken, not the submission.
The checker's stderr comes back as `checkerMessage` and is shown to the student, so say why the
answer was rejected. A checker that fails to compile is HTTP 200 with `checkerError`, deliberately
separate from `compileError` so a misconfigured problem never reaches a student as their own compile
error. Test one by pointing `JUDGE_CHECKER` at it, every other argument unchanged:

```bash
JUDGE_CHECKER=checker.cpp .claude/skills/add-problem/scripts/judge-lock.sh submit sol.cpp cpp17 tests.json <tl> <ml>
```

**A checker problem must prove two things in step 6, not one:** that a genuinely wrong answer is
rejected, **and** that a correct-but-byte-different answer scores 100%. The second is the whole point
of having a checker and the easy one to forget — submit a solution that is correct but orders or
formats its answer differently from the stored expected output, and confirm it is fully accepted.

## Pipeline

Run this in full, per problem, in order. Later steps depend on earlier ones having actually passed.

**1. Read the source.** PDFs go through the Read tool with a `pages` range; Markdown, text, and
images likewise. Pull out the title (contest prefix included), the statement, the input and output
specifications, the constraints, every sample, the marks/subtask breakdown if there is one, and the
official time and memory limits if stated. If the source is a scan or has figures you cannot read,
say which parts you could not extract rather than inventing them. There is nowhere in this repo to
host a figure, so a diagram becomes an `[image goes here]` placeholder the user fills in by hand —
never invent a description of one.

**2. Write the statement.** See `reference/statement-format.md` for the required shape, the
Markdown quirks, and how to pick `id`, `points`, `time_limit`, and `memory_limit`.

**3. Write `generator.cpp`.** See `reference/generator-style.md`. The house style is specific and
non-optional: the fixed RNG seed `123456789`, the verbatim `json_escape` helper, the section
banners, samples verbatim first. Work out the byte budget *before* writing it — capping `N` so a case
stays under ~150 KB is a decision made in the generator, not discovered afterwards. Test data is
**deliberately sized below the official constraints**, because source bounds routinely imply multi-MB
cases that breach the 1 MB per-case cap: cap `N`, and **state the cap and its reason in the
generator's test-plan comment**. Honest consequence — at reduced sizes a suboptimal-complexity
solution can pass where the official data would have rejected it.

**4. Write a reference solution.** A separate file, not stored in the database; it is what proves the
generated expected outputs are correct. Prefer C++ (`cpp17`), so its runtime is comparable to what
students will submit.

**5. Generate the test data on the live judge.**

```bash
.claude/skills/add-problem/scripts/judge-lock.sh generate generator.cpp tests.json
```

This is the **only** way test data gets produced — not locally, not by hand. It proves the generator
compiles and runs inside the Render sandbox, which is what a manager re-running it later depends on,
and `bits/stdc++.h` does not exist under Apple clang, so a local build proves nothing anyway.

The command prints the case count and byte sizes and fails if any cap is breached. If the generator
fails to compile or its output will not parse, the judge returns the raw stdout and stderr — fix the
generator and re-run. Never hand-edit `tests.json` to make it pass; the stored generator has to
reproduce the stored data exactly.

**6. Verify against the live judge.**

```bash
.claude/skills/add-problem/scripts/judge-lock.sh submit solution.cpp cpp17 tests.json <timeLimitMs> <memLimitMb>
```

The reference solution must pass **every** case; anything less means the generator's expected outputs
are wrong and the problem is not ready. The command also reports the slowest case — if it is anywhere
near the time limit, raise the limit or shrink the cases, because the host will be slower on a bad
day. Then confirm the tests actually discriminate: submit a deliberately wrong solution (an
off-by-one, a brute force that ignores an edge case) and check it *fails*. A test set that everything
passes is not a test set.

**7. Insert into Supabase.** See `reference/database.md` for the column reference, the dollar-quoted
insert, and the escaping traps. `is_active` is `true` — the ask is a visible, active problem. Store
`generator_file` in the same insert (and `checker`, if the problem has one); a problem published
without its generator is half-published.

**Never paste a large `jq` dump into SQL.** Output above roughly 30 KB is silently truncated on its
way through the Bash tool, and a truncated case lands in `input`/`output` looking perfectly valid.
Reconstruct large cases in SQL (`repeat()`, `generate_series`) or verify each with a checksum.

**8. Verify the write end to end.** Read the row back with the verification query in
`reference/database.md`, then pull the arrays *as stored in the database* and run the reference
solution against them one more time:

```bash
.claude/skills/add-problem/scripts/judge-lock.sh submit solution.cpp cpp17 stored-tests.json <tl> <ml>
```

This is the step that catches escaping damage and truncation on the round trip through `jsonb`, and
it is the only run that tests the exact bytes a student's submission will be graded against. It must
be 100% AC — it has caught two independent corruption events. `reference/database.md` shows how to
pull the stored arrays into a file without reading them, and how to confirm the stored generator
still reproduces the stored data exactly.

**9. Report.** Give the user the problem id, title, points, limits, case count, total payload size,
and the verdict summary from step 8. If anything is left for them to do by hand — a missing figure,
a judgement call on points — say it explicitly.

## No migration file for this

Publishing a problem does **not** get an entry in `supabase/migrations/`, even though it goes through
the Supabase MCP. The repo's `AGENTS.md` requires a new migration only for changes to the database's
*structure or behaviour* — tables, columns, constraints, indexes, RLS policies, functions, triggers,
RPCs, enums, extensions, storage. A problem is a row of content in an existing table, exactly like a
news post, and logging rows there would bury the schema changes the history exists for. Same for the
rest of this workflow: flipping `is_active`, correcting a statement, adding or regenerating test
data or a checker, deleting a problem you just added. All rows, no migrations.

If publishing a problem ever seems to *require* a schema change, stop — that is a real migration and
a separate conversation with the user.

## Bulk mode

When given a folder, run the full pipeline for **one problem at a time, start to finish**. Never
batch — generating every test set and then inserting them all leaves the database, on a failure
halfway, in a state nobody can reason about.

- Read the folder first and confirm the list of problems with the user before starting, including
  the `id` you intend to use for each. Slug collisions are much cheaper to fix now.
- The judge rate-limits to 60 requests per minute shared across `/submit` and `/generate-tests`, and
  every request from this app shares one bucket. Two to four calls per problem means a large batch
  needs pacing, not parallelism. Even with several agents on the folder, `judge-lock.sh` keeps the
  judge calls serial — everything else (reading sources, writing statements, database work) is what
  actually parallelizes.
- **CCC shares problems across divisions.** `ccc23s1` is also J4, `ccc26s2` is also J5. A missing
  J-number in a year folder usually means the problem is dual-listed, not missing. Publish it once
  under the Senior slug and keep the dual attribution in the statement's opening line.
- If one problem fails, leave it out, keep going with the rest, and collect the failures. Report at
  the end which were published and which were not, with the specific reason for each.
- Track progress with the task tools for anything over a handful of problems, so the state survives
  a long run.

## Never

- Never run or host `wmoj-judge` locally to test a problem, and never call `judge.sh` directly —
  every judge call goes through `judge-lock.sh` so concurrent agents cannot corrupt each other.
- Never publish through the UI, the app's API routes, or anything other than a direct database
  insert via the Supabase MCP.
- Never proceed when the Supabase MCP is down or pointed at the wrong project — stop and say so.
- Never store test data the live judge did not produce from the stored generator.
- Never publish a checker problem without proving *both* halves of the rule above: a wrong answer
  rejected, and a correct-but-byte-different answer at 100%.
- Never mark a problem active before step 8 passes.
- Never insert a submission row to "test" a problem. Submissions feed points, solve counts, and
  leaderboards; verification goes straight to the judge and leaves no trace.
- Never invent a `created_by` UUID, a figure you could not read, or an unstated constraint.

---

**Keeping this current:** if you find anything here that is outdated, stale, wrong, or missing —
a changed judge contract, a new column, a shifted cap, a style rule the existing generators no
longer follow, or something you had to work out the hard way — update it as part of your change.
This skill is only useful while it is accurate.
