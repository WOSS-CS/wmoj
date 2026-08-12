# dev-loop charter

**Binding on every agent in a dev-loop run, including the main session.** Read it in
full before you do anything else. Where this charter and your own instructions
disagree, the charter wins — except that `AGENTS.md` at the repo root wins over both.

---

## 1. What a dev-loop run is

One user task, driven through six phases by a fixed tree of agents. Every phase ends
with a written artifact; the next phase starts by reading it. Nobody re-derives what a
previous phase already wrote down.

| Phase                | Owner                                                                                 | Produces                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 0 · Exploration      | main session + 4 × `codebase-explorer`                                                | a complete map of the codebase                                                              |
| 1 · Plan creation    | `plan-orchestrator` → 3 × `sub-planner` → 3 × `sub-plan-auditor` each                 | three independent plans, merged into one                                                    |
| 2 · Plan review      | `plan-orchestrator` → 3 × `plan-auditor`                                              | the audited, final `plan.md`                                                                |
| 3 · Implementation   | `implementation-orchestrator` → 4 × `implementer` → 2 × `implementation-auditor` each | the code change                                                                             |
| 4 · Review + testing | `review-orchestrator` → 3 × `reviewer` → 3 × `code-reviewer` + 1 × `end-to-end` each  | findings, fixes, and a convergence verdict — **repeats until an iteration changes nothing** |
| 5 · Commit + push    | main session                                                                          | a commit on the task branch, pushed                                                         |

The tree is exactly three agent layers deep. Nothing in this pipeline needs a fourth.

## 2. Absolute prohibitions

Every agent, every phase. No exceptions, no "just this once".

- **Never `git commit`, `git push`, `git checkout`, `git switch`, `git merge`, `git rebase`,
  `git reset`, `git stash`, `git clean`, or `git restore`.** Only the main session commits and
  pushes, and only in Phase 5. You are already on the correct branch; leave it that way.
- **Never touch `.env`, `.env.local`, or any credential file**, and never print a secret,
  token, key, or password into a report, a log, or your final message. Redact to shape
  (`{status, reason}`), the way `AGENTS.md` requires of third-party API errors.
- **Never ask the user a question.** Subagents have no user. If you are blocked, say so in
  your report and return; the main session is the only agent that may consult the user.
- **Never publish an Artifact**, open a browser through `claude-in-chrome`, or start a
  Workflow. The pipeline is exactly the agent tree in §1.
- **Never run destructive SQL** against the live database — no `DROP`, no `TRUNCATE`, no
  unqualified `DELETE`/`UPDATE`, no disabling of RLS. Reads and additive migrations only.
- **Never delete or modify data you did not create.** A dev-loop test account may only
  touch its own rows.
- **Never write outside the paths you were given.** Your prompt names exactly one report
  path (and, for implementers, one set of owned source paths). Nothing else is yours.

## 3. Git: the canonical commands

The run's base commit is passed to you as `BASE_SHA`. Work is **uncommitted** until Phase 5,
so `git diff BASE_SHA` alone is not complete — it misses new files. The whole-task diff is
always taken from the index, which a writing agent refreshes before spawning readers:

```bash
# Refresh the index (writing agents only — orchestrators and implementers)
git add -A

# The canonical whole-task diff (any agent; readers do NOT run `git add`)
git diff --cached "$BASE_SHA"
git diff --cached --name-status "$BASE_SHA"     # the changed-file set
git diff --cached --stat "$BASE_SHA"            # size of the change

# The working-tree fingerprint used to decide whether an iteration changed anything
git add -A && git write-tree
```

`.dev-loop/` is listed in `.git/info/exclude`, so `git add -A` never stages a run artifact.
Staging is not committing — nothing leaves the working tree until Phase 5.

## 4. The repo's own rules

`AGENTS.md` (imported by `CLAUDE.md`) is binding and it is not boilerplate. It records
load-bearing invariants that look like ordinary code until you break one. Read it before
you plan, implement, or review.

The gates, which must all be green before Phase 5 commits:

```bash
npm run typecheck    # tsc --noEmit — keep at 0 errors
npm test             # vitest run (node env)
npm run lint         # eslint — keep at 0 errors (pre-existing warnings are expected)
npm run build        # next build — Phase 3 and Phase 5 only
```

Node 22.x. Do **not** run `npm run format:check` as a gate while `.dev-loop/` exists — it
checks the whole tree including run artifacts. Check formatting on changed files only:

```bash
git diff --cached --name-only "$BASE_SHA" | grep -E '\.(ts|tsx|mjs|json|css|md)$' | xargs -r npx prettier --check
```

Two repo rules that are easy to violate by accident:

- **Next.js 16 canary is not the Next.js you know.** Read the relevant guide under
  `node_modules/next/dist/docs/` _before_ writing App Router, caching, or route-handler code.
- **Every schema change must land as a timestamped file in `supabase/migrations/`.** If you
  apply DDL through the Supabase MCP, the migration file is part of the same change, not a
  follow-up. `lib/types/database.ts` is hand-maintained — verify it against the live schema.

## 5. MCP: know what is connected, and use it

`.mcp.json` declares the project's MCP servers; the user's own config may add more. Read it at
the start of the run to learn what is actually connected and with which project ref — typically
a **Supabase** server for this project, with user-level servers such as Vercel and
Claude-in-Chrome alongside it.

**MCP tool schemas are often deferred — a tool you cannot see may still exist.** Before you
conclude a capability is unavailable, search for it:

```
ToolSearch("+supabase")             # or: ToolSearch("select:mcp__supabase__execute_sql")
ToolSearch("+vercel runtime logs")
```

Use them where they are the right tool, not as a formality:

- **Schema questions**: the live database is ground truth. `list_tables` / `execute_sql`
  (SELECT) beats inferring from `lib/types/database.ts`, which is hand-maintained and can drift.
- **DDL**: `apply_migration` — and commit the matching `supabase/migrations/*.sql` file.
- **Production behaviour**: Vercel runtime logs/errors when the task concerns something
  that only misbehaves in production.

If a server needs authentication and is unreachable, say so plainly in your report and name
what you could not verify because of it. Do not guess and do not pretend the check happened.

## 6. Artifacts

Everything the run writes lives under `.dev-loop/` at the repo root — **markdown only**,
because the directory sits inside a repo whose formatter and linters walk the tree. Anything
heavy (Playwright, app copies, screenshots, `node_modules`) goes in the out-of-repo
`WORKSPACE` directory named in your prompt.

```
.dev-loop/
  run.md                     run manifest: task, branch, BASE_SHA, WORKSPACE, phase log
  task.md                    the user's task, verbatim
  plan.md                    the single authoritative plan
  context/
    00-baseline.md           gate results before any change was made
    01-codebase.md           Phase 0 → 1
    02-plan-handoff.md       Phase 2 → 3
    03-implementation.md     Phase 3 → 4
    04-review-ledger.md      Phase 4, appended per iteration → 5
  phase0/  explorer-N.md
  phase1/  plan-N.md · plan-N-audit-M.md · synthesis.md
  phase2/  audit-N.md · revisions.md
  phase3/  packages.md · implementer-N.md · implementer-N-audit-M.md · orchestrator-review.md
  phase4/  iteration-K/ reviewer-N.md · reviewer-N-code-M.md · reviewer-N-e2e.md · verdict.md
```

Rules: inside the repo, write only to the artifact path your prompt gives you. Under
`WORKSPACE` you may write freely — scoped diffs, file lists, specs, logs — as long as the
filenames carry your own index so two agents never collide. Never edit another agent's
artifact; if you disagree with it, say so in yours. Artifacts are deleted before the Phase 5 commit,
so nothing in them may be load-bearing for the shipped change: anything that must survive
the run belongs in the code, in a test, or in `AGENTS.md`.

## 7. Spawning: the Standard Preamble

Only these agents may spawn, and only these children:

| Spawner                       | May spawn                                                                                      | Count                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------- |
| main session                  | `codebase-explorer`, `plan-orchestrator`, `implementation-orchestrator`, `review-orchestrator` | 4 / 1 / 1 / 1-per-iteration |
| `plan-orchestrator`           | `sub-planner`, then `plan-auditor`                                                             | 3, then 3                   |
| `sub-planner`                 | `sub-plan-auditor`                                                                             | 3                           |
| `implementation-orchestrator` | `implementer`                                                                                  | 4                           |
| `implementer`                 | `implementation-auditor`                                                                       | 2                           |
| `review-orchestrator`         | `reviewer`                                                                                     | 3                           |
| `reviewer`                    | `code-reviewer`, `end-to-end`                                                                  | 3, 1                        |

Everyone else is a leaf and does the work itself. Leaves have the Agent tool removed, so a
leaf that tries to delegate simply fails.

**Every group is a barrier.** Launch the whole group in ONE message, one `Agent` call per
member, each with `run_in_background: false`. That way the group runs concurrently and you
do not resume until every member has returned. Never start pooling, merging, or fixing
while a sibling is still running.

**If a member returns nothing, or its artifact is missing or empty**, re-spawn that one
member once with the same prompt plus a note that its predecessor produced nothing. If it
fails twice, record the gap explicitly — in your artifact and in your return — and continue
with the survivors. A group that silently ran at N−1 is worse than one that says so.

Every spawn prompt opens with this preamble, filled in. It is what keeps a child from
re-reading the repo to rediscover facts the run already knows.

```
You are a `<agent-type>` in a dev-loop run, instance <k> of <N>.

RUN FACTS
  repo root   : <absolute path>
  run id      : <RUN_ID>
  branch      : <BRANCH>        — never switch it, never commit, never push
  BASE_SHA    : <sha>           — canonical diff: git diff --cached <sha>
  WORKSPACE   : <absolute out-of-repo scratch path>
  phase       : <n> — <name>

THE TASK, VERBATIM FROM THE USER
<<<TASK
<the user's words, unedited>
TASK

READ FIRST, IN THIS ORDER — these already answer most of what you need
  1. AGENTS.md
  2. .claude/skills/dev-loop/reference/charter.md
  3. <inbound artifacts, most specific last>

YOUR JOB
<what only this instance is responsible for, and what "done" means>

WRITE YOUR REPORT TO
  .dev-loop/<exact path>.md    — the only path you may create or modify

RETURN
<the compact digest spec from §9, tailored>
```

## 8. Evidence standards

Lifted from `AGENTS.md`, because this pipeline is exactly where they get violated:

> A check that cannot distinguish "passed" from "did not run" is not a check.

- **Positive control.** Before trusting an empty result, prove your detector fires. A grep
  that errors, a test that skips, a page that never loaded — all look like success.
- **Coverage assertion.** Prove you actually scanned what you claim to have scanned. When
  work is split across agents, verify the union of the parts equals the whole with a
  **set difference**, never a count. Three wrong files and three wrong rows cancel out in a count.
- **Never report green for something you did not exercise.** "Blocked", "not run", and
  "could not reach" are respectable results. A fabricated pass is not.
- **Cite.** Every claim names a file and line, a command and its output, or an observed
  behaviour. "This looks fine" is not a finding and neither is "this looks wrong".

## 9. Return contract

Your final message **is** your return value — it goes into your parent's context, not to a
human. No greeting, no sign-off, no restatement of your instructions. Write the full detail
to your artifact and return a compact digest:

```
charter: read
artifact: .dev-loop/<path>.md
status: complete | partial | blocked
<3–15 lines: what you did, what you found, what is unresolved>
blockers: <none | one line each>
```

Parents: read the artifact when you need the detail. Do not ask a child to repeat itself.

## 10. Actionable vs. nitpick

**The single rubric every auditor, reviewer, and orchestrator in this run uses.** Phase 4
loops until an iteration produces no code change, so mis-classifying taste as a defect makes
the loop run forever, and mis-classifying a defect as taste ships a bug.

A finding is **actionable** — it warrants a code change — only if all four hold:

1. It names a specific file and line, or a specific observable behaviour.
2. It states a concrete consequence: wrong output, crash, data loss, security hole, a broken
   `AGENTS.md` invariant, a failing gate, a deviation from `plan.md`, or a user-visible defect.
3. It can be demonstrated — a repro, a failing assertion, or an argument that survives
   reading the code. Not "someone might one day".
4. It is not a matter of taste.

Classify as **actionable** without hesitation: logic errors; unhandled failure modes on paths
that can realistically fail; race conditions and lost writes; auth/ownership gaps; violated
invariants from `AGENTS.md`; schema changes with no migration file; `typecheck`/`lint`/test
failures **including pre-existing ones**; missing tests for behaviour this change introduces;
a plan step silently dropped; a user-visible defect seen in end-to-end testing.

Classify as **not actionable** — record it, do not act on it: naming and style preferences;
"consider extracting/refactoring"; speculative future-proofing; requests for tests of
behaviour this change did not touch; documentation polish unrelated to the change;
re-litigating a decision Phase 2 already settled with reasons; anything phrased as "might",
"could", or "consider" with no demonstration attached.

**Pre-existing problems that are not this task's fault:**

- Red gates (`typecheck`, `lint`, `test`) — **always fix**. The repo's standard is zero, and
  a red gate cannot tell you whether your change broke it.
- A clearly-wrong UI detail on a flow this change actually exercises — **may fix**, if the
  fix is small and self-contained. Record it as collateral with its justification.
- Anything else — **record as collateral, do not fix.** Scope belongs to the user. Report it;
  let them decide.

**Do not make changes to be on the safe side.** Every change in Phase 4 must cite the finding
that forced it. A change nobody asked for keeps the loop spinning and hides the real signal.

## 11. Context economy

Reading the same file in eight agents is how this pipeline gets slow and inconsistent. Read
your inbound artifacts first — the codebase map, the plan, the handoff — and treat them as
true. Then read deeply, and only, the files you will change, review, or reason about
precisely. If an artifact is wrong, say so in your report; do not quietly re-derive the world.
