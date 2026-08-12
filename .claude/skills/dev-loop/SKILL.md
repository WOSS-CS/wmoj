---
name: dev-loop
description: Run the full audited development pipeline on one task — explore the whole codebase, generate and audit three competing plans, implement in four audited packages, then review and end-to-end test in a loop until an iteration finds nothing left to fix, and commit and push the result on its own branch.
argument-hint: <the task to implement, in full>
disable-model-invocation: true
---

# dev-loop

You are the **main session**. You conduct this run; you do almost none of the work yourself.

## The task

Everything between the markers is the user's task, verbatim. It is the single input to this
pipeline and it is passed unedited into every agent that runs.

```text
$ARGUMENTS
```

If that block is empty or still reads literally `$ARGUMENTS`, the task is whatever the user
wrote after `/dev-loop` in their most recent message — take it verbatim from there. If there
is nothing there either, stop and ask what to build; do not invent a task.

---

## Before anything else

1. Read `.claude/skills/dev-loop/reference/charter.md` in full. It binds you too.
2. Read `AGENTS.md`.

Then hold these for the whole run:

- **Every spawn is synchronous.** One message, one `Agent` call per group member, each with
  `run_in_background: false`. You do not resume until every member of the group has returned.
  That is what makes "strictly after all of them finish" true rather than aspirational.
- **Every spawn prompt uses the Standard Preamble** (charter §7), filled in with the run
  facts and the exact artifact paths. Appendix A below gives the per-agent fill-ins.
- **You are the only agent that commits, pushes, or talks to the user.**
- **Never silently drop a member of a group.** Charter §7 says what to do when one fails.
- Between phases, tell the user in one or two lines what just finished and what is starting.
  No progress theatre, no per-agent commentary.

---

## Setup

Do this before Phase 0, in order.

```bash
git rev-parse --is-inside-work-tree            # must be true
git status --porcelain                          # must be empty
```

If the working tree is dirty, **stop and ask** (AskUserQuestion) whether to carry the changes
onto the new branch, stash them, or abort. Sweeping someone's work into a task branch, or
into this run's commit, is not yours to decide.

```bash
REPO="$(git rev-parse --show-toplevel)"
BASE_SHA="$(git rev-parse HEAD)"
BASE_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
BRANCH="dev-loop/<slug>-$RUN_ID"                # <slug>: the task in kebab-case, ≤40 chars
git checkout -b "$BRANCH"                       # from current HEAD; do not fetch, pull or rebase

grep -qxF '.dev-loop/' .git/info/exclude || printf '%s\n' '.dev-loop/' >> .git/info/exclude
mkdir -p .dev-loop/context .dev-loop/phase0 .dev-loop/phase1 .dev-loop/phase2 .dev-loop/phase3
```

`WORKSPACE` is an **out-of-repo** scratch directory for anything that is not markdown —
Playwright, app copies, screenshots. Use the scratchpad directory from your system prompt if
you have one, otherwise `${TMPDIR:-/tmp}`; either way create `<that>/dev-loop-$RUN_ID` and
record the absolute path.

Write `.dev-loop/task.md` — the user's task, verbatim, nothing added — and `.dev-loop/run.md`:

```markdown
# dev-loop run <RUN_ID>

- repo: <REPO>
- branch: <BRANCH> (base branch: <BASE_BRANCH>)
- BASE_SHA: <BASE_SHA>
- WORKSPACE: <absolute path>
- started: <ISO timestamp>

## Phase log

| phase | started | finished | outcome |
| ----- | ------- | -------- | ------- |
```

Keep the phase log current — it is how a resumed or interrupted run finds its place.

**Baseline gates.** Run them now, before a single line changes, and write
`.dev-loop/context/00-baseline.md` with the exact output summary of each:

```bash
npm run typecheck ; npm run lint ; npm test
```

A failure here is pre-existing, not yours — but the repo's standard is zero and the user's
standing instruction is to fix red gates wherever they are found. Record each failure; the
plan must decide what to do with it. Without this file you cannot tell a regression from a
pre-existing failure later, and you will waste an entire Phase 4 iteration finding out.

---

## Phase 0 · Exploration

**Goal:** four agents collectively read every file in the repository, and you turn what they
found into the map every later phase reads instead of re-exploring.

**Partition.** Split the tracked files four ways, balanced by size, along subsystem
boundaries so each explorer gets coherent territory rather than an alphabetical slice
(routes, shared library code, components + content, and tests + migrations + config is a
reasonable starting shape — derive the real one from the actual tree).

Every tracked file must land in exactly one assignment. Verify it with a set difference, not
a count (charter §8):

```bash
git ls-files | sort -u > "$WORKSPACE/all-files.txt"
cat "$WORKSPACE"/assign-*.txt | sort -u > "$WORKSPACE/union.txt"
comm -3 "$WORKSPACE/all-files.txt" "$WORKSPACE/union.txt"    # must print nothing
```

Binaries and generated files (`package-lock.json`, images, fonts, audio) are still assigned —
the explorer inventories them rather than reading them, and says so. Nothing is skipped
silently.

**Spawn** 4 × `codebase-explorer`, one message, `run_in_background: false`, using the
Appendix A fill-in. Each writes `.dev-loop/phase0/explorer-<n>.md`.

**Synthesize.** When all four have returned, write `.dev-loop/context/01-codebase.md`
yourself. This is the most reused artifact in the run; make it worth reading:

- What this system is and how a request flows through it end to end.
- The subsystem map: each area, what it owns, its entry points, and the files that matter.
- The invariants and traps — from `AGENTS.md` and from what the explorers actually found in
  the code, with file:line.
- The conventions a new change must match: data access, error handling, testing, styling.
- **Task-relevant surface**: the files, tables, and flows this particular task will touch,
  and the ones that look adjacent but are not.
- Open questions the explorers could not resolve from the code.

Then wind the explorers down (charter §7): confirm the four artifacts exist and are
non-empty, confirm no background task is still running, and never message them again.

---

## Phases 1 and 2 · Plan creation and plan review

Both phases belong to a single `plan-orchestrator`. Spawn it **once**; it runs Phase 1, then
Phase 2, then returns. Do not spawn a second one.

```
main → plan-orchestrator ─┬─ Phase 1: 3 × sub-planner → each spawns 3 × sub-plan-auditor
                          └─ Phase 2: 3 × plan-auditor (read-only), then final revision
```

Spawn 1 × `plan-orchestrator` with the Appendix A fill-in.

**When it returns**, verify before moving on:

- `.dev-loop/plan.md` exists and is a real implementation plan — ordered steps, owned files,
  acceptance criteria, test strategy, migration plan if the schema changes, rollback notes.
- `.dev-loop/context/02-plan-handoff.md` exists: the decisions taken, the alternatives
  rejected and why, the audit findings that changed the plan, and the risks still open.
- `.dev-loop/phase1/plan-{1..3}.md` and their audits exist; `.dev-loop/phase2/audit-{1..3}.md`
  exist. Three plans, nine plan audits, three plan reviews. If a file is missing, the
  orchestrator dropped a group member — say so to the user and decide with them whether to
  re-run the phase.

Read `plan.md` and `02-plan-handoff.md` yourself. You are about to authorise four agents to
change the codebase on the strength of that document. If it does not describe a change you
would sign off on, say so to the user before Phase 3.

---

## Phase 3 · Implementation

Spawn 1 × `implementation-orchestrator`. It partitions the plan into four packages with
**disjoint file ownership**, spawns four `implementer`s (in dependency waves if the plan
requires it), each of which audits its own work with two `implementation-auditor`s, then
integrates, runs the gates, and reports.

```
main → implementation-orchestrator → 4 × implementer → each spawns 2 × implementation-auditor
```

**When it returns**, verify:

- `.dev-loop/context/03-implementation.md` exists and states, per plan step, what was built,
  where, and how it was verified — including anything the plan called for that was **not**
  built, and why.
- `.dev-loop/phase3/packages.md` shows the ownership map, and every changed file traces to
  exactly one package.
- The gates are green:

```bash
git add -A
npm run typecheck && npm run lint && npm test && npm run build
git diff --cached --stat "$BASE_SHA"
```

If a gate is red, that is a Phase 3 failure, not a Phase 4 finding. Re-spawn a fresh
`implementation-orchestrator` seeded with the failing output and the existing artifacts, and
have it finish the job. Phase 4 reviews finished work.

---

## Phase 4 · Review and testing — the loop

**Pre-flight, iteration 1 only.** Provision the end-to-end kit and the three test accounts
exactly as `.claude/skills/dev-loop/reference/e2e-playbook.md` §1 describes. Do it yourself,
once: three agents racing on one Playwright download or one account namespace is a flake
factory. If provisioning fails, continue anyway — every `end-to-end` agent will then report
the authenticated surface as **blocked**, which is a truthful result and a signal to the user,
not a reason to stop.

**Each iteration:**

```bash
ITERATION=<k>
mkdir -p ".dev-loop/phase4/iteration-$ITERATION"
TREE_BEFORE="$(git add -A && git write-tree)"
```

Spawn 1 × `review-orchestrator` for this iteration, seeded with the ledger so far and with
anything you know is outstanding (a red gate, an unjustified change from last iteration).
It spawns three independent `reviewer`s; each spawns three `code-reviewer`s — every one of
them over the whole diff, each through a different lens the reviewer chooses — plus one
`end-to-end` tester over the whole app. It then pools everything, applies **only** the fixes
that the charter §10 rubric calls actionable, and writes a verdict.

```
main → review-orchestrator → 3 × reviewer ─┬─ 3 × code-reviewer (whole diff, one lens each)
                                           └─ 1 × end-to-end (whole app, headless Playwright)
```

**When it returns**, decide convergence yourself — objectively, not on the orchestrator's word:

```bash
TREE_AFTER="$(git add -A && git write-tree)"
npm run typecheck && npm run lint && npm test
```

The loop **breaks** only when all three hold:

1. `TREE_AFTER == TREE_BEFORE` — the iteration changed nothing.
2. `typecheck`, `lint`, and `test` are all green.
3. `.dev-loop/phase4/iteration-$ITERATION/verdict.md` lists no open actionable finding.

Otherwise append to `.dev-loop/context/04-review-ledger.md`, increment, and run another
iteration with a **fresh** `review-orchestrator`. The old one is finished; it is never reused
and never messaged again.

Three things to hold firm on:

- **A red gate with an unchanged tree is not convergence** — it means the orchestrator failed
  to act. Seed the next iteration with the failing output explicitly.
- **If the tree changed, the verdict must justify it.** Every changed file traces to a cited
  finding. If it does not, record the discrepancy in the ledger and seed the next iteration
  with "justify or revert these changes" — a change nobody asked for is exactly what keeps
  this loop from terminating.
- **Nitpicks do not extend the loop.** Charter §10 is the rubric. Taste, hypotheticals, and
  "consider refactoring" get recorded and ignored.

**Circuit breaker.** If iteration 6 does not converge, stop and put it to the user
(AskUserQuestion): keep looping, stop here and commit what exists, or abort the run. Include
the last two verdicts and the findings that keep recurring. Watch for oscillation as well —
the same finding fixed and re-raised across iterations means the two sides disagree about
intent, and that is a question for the user, not another lap.

---

## Phase 5 · Commit and push

Only after Phase 4 converges.

1. **Surface what the loop deliberately did not fix.** Collateral findings (charter §10) —
   pre-existing defects the reviewers saw and left alone — go to the user now, in a short
   list, before anything is deleted. They are the user's call, not yours to bury.

2. **Clean up.** Every agent has returned; confirm no background task is still running.

```bash
rm -rf .dev-loop
rm -rf "$WORKSPACE"                       # app copies, Playwright kit, screenshots, accounts.json
```

Delete the three test accounts with the service-role client (`auth.admin.deleteUser`) and
verify no rows they created survive — a namespaced account left behind in the live project
is litter with a password attached. Do this before removing `WORKSPACE`, since the
credentials live there.

If the run ended at the circuit breaker or was aborted, **keep both directories** and tell
the user where they are.

3. **Verify.** The gates, on the final tree, with nothing left to clean up:

```bash
git status --porcelain | grep -E '^\?\? \.dev-loop' && echo "ARTIFACTS STILL PRESENT — stop"
npm run typecheck && npm run lint && npm test && npm run build
```

Red here means do not commit. Go back to Phase 4 with the failure as the seed.

4. **Commit and push.**

```bash
git add -A
git status --short                        # read it; nothing unexpected, no artifacts
git commit -m "<subject>" -m "<body>"
git push -u origin HEAD
```

The message describes the **change**, in the style the repo already uses (`git log`),
subject ≤72 characters, body covering what and why. It never mentions this pipeline,
its agents, or its artifacts, and it carries **no co-author or attribution trailer**.

Stay on the branch. Do not merge, do not switch to `main`, do not force-push. If there is
no `origin`, commit anyway and tell the user the push was skipped and why.

5. **Report.** To the user, briefly: what was built, the branch and commit, how many Phase 4
   iterations it took and what the last one changed, the collateral list from step 1, and
   anything that stayed unverified — a blocked end-to-end surface, an untestable flow, an
   unreachable MCP server. Understate nothing. If a check did not run, say that it did not run.

---

## Appendix A · Spawn fill-ins

Each of these goes into the **`YOUR JOB`** section of the Standard Preamble (charter §7). The
preamble already carries the task, the run facts, and the reading order; do not restate them.

### `codebase-explorer` × 4 — Phase 0

```
YOUR JOB
Read every file assigned to you, in full, and map your territory for the phases that follow.
Your assignment (<count> files) is exactly this list — no more, no less:
<the file list, or the precise globs plus the resolved list>

Files you cannot usefully read (binary, generated, lockfile) are inventoried with a reason,
never skipped in silence. Depth is proportional to relevance: everything gets mapped, the
files this task will touch get read closely.

READ FIRST
  1. AGENTS.md
  2. .claude/skills/dev-loop/reference/charter.md
  3. .dev-loop/task.md
```

### `plan-orchestrator` × 1 — Phases 1 and 2

```
YOUR JOB
Own Phase 1 and Phase 2 end to end and return one plan the implementation phase can execute.
Phase 1: three independent sub-planners, each self-audited by three sub-plan-auditors; then
you merge the three into .dev-loop/plan.md. Phase 2: three read-only plan-auditors over that
plan, pooled strictly after all three return, then your own final pass.

Deliverables: .dev-loop/plan.md, .dev-loop/context/02-plan-handoff.md,
.dev-loop/phase1/synthesis.md, .dev-loop/phase2/revisions.md.

READ FIRST
  1. AGENTS.md
  2. .claude/skills/dev-loop/reference/charter.md
  3. .dev-loop/task.md
  4. .dev-loop/context/01-codebase.md
  5. .dev-loop/context/00-baseline.md
```

### `implementation-orchestrator` × 1 — Phase 3

```
YOUR JOB
Build what plan.md specifies. Partition it into exactly four packages with disjoint file
ownership, run four implementers (in dependency waves if the plan requires it), integrate
their work, get every gate green, and hand Phase 4 a change it can review.

Deliverables: the code change, .dev-loop/phase3/packages.md,
.dev-loop/phase3/orchestrator-review.md, .dev-loop/context/03-implementation.md.

READ FIRST
  1. AGENTS.md
  2. .claude/skills/dev-loop/reference/charter.md
  3. .dev-loop/plan.md
  4. .dev-loop/context/02-plan-handoff.md
  5. .dev-loop/context/01-codebase.md  (map — read the parts your packages touch)
```

### `review-orchestrator` × 1 per iteration — Phase 4

```
YOUR JOB
Run iteration <K> of the review loop. Three independent reviewers, each covering the entire
change on its own — three code-reviewers each reading the whole diff through a different lens
the reviewer chooses, plus one end-to-end tester over the whole application. Pool strictly
after all three return, classify every finding by charter §10, fix exactly what is actionable,
and write a verdict that justifies every change you made by citing the finding that forced it.

Making no changes is a valid and often correct outcome: it is how this loop terminates.
Do not change code to be on the safe side.

Iteration: <K>          Iteration directory: .dev-loop/phase4/iteration-<K>/
E2E kit: <WORKSPACE>/e2e-kit (provisioned; accounts in accounts.json)
Outstanding from the main session: <red gates, unjustified changes, or "none">

READ FIRST
  1. AGENTS.md
  2. .claude/skills/dev-loop/reference/charter.md
  3. .dev-loop/plan.md
  4. .dev-loop/context/03-implementation.md
  5. .dev-loop/context/04-review-ledger.md   (iterations after the first)
```

---

## Appendix B · When something goes wrong

- **An agent returns nothing or writes no artifact** — charter §7: re-spawn that one member
  once, then record the gap loudly.
- **An orchestrator returns but its phase is incomplete** — do not paper over it yourself.
  Re-spawn a fresh orchestrator for that phase, seeded with the artifacts that do exist and
  an explicit statement of what is missing.
- **A gate is red at a phase boundary** — it belongs to the phase that broke it. Send it back.
- **The task turns out to be impossible or ill-posed as written** — stop the pipeline and tell
  the user what the planning phase found. Do not implement a guess through the whole pipeline.
- **You are interrupted mid-run** — `.dev-loop/run.md` and the artifacts on disk are the state.
  Read them, find the last completed phase, and resume from the next one.
