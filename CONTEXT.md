# CONTEXT.md — domain vocabulary for wmoj-app

Terms the code is named after. When a module is named after a concept, that concept is defined
here. Keep entries short; link to the module that owns the behaviour.

## Contests

- **Participation** — a user currently running a contest: a `contest_participants` row plus a
  `countdown_timers` row. The row alone grants nothing; access needs an unexpired timer
  (`lib/contestGate.ts`).
- **Countdown timer** — the per-(user, contest) window: `started_at` + `duration_minutes`.
  Read with `readTimer`; the arithmetic is `remainingSeconds` (`lib/contestTimer.ts`).
- **Expiry** — the moment a countdown reaches zero. Reading it never changes anything.
- **Expire a participation** — end one user's run: stamp `join_history.left_at`, remove the
  participant row, remove the timer. `expireParticipation`; reached through `POST /leave`. It stamps
  `now()` — the instant a *voluntary* leave ends the run — and only ever stamps a run the sweep has
  not already ended.
- **Sweep** — end every expired participation at once. `sweep_expired_participation()` in
  Postgres, called at the top of `POST /join` and `POST /leave`. Never from a GET or a page render.
  Its `left_at` is the instant the window closed, not the instant the sweep ran.
- **Join history** — the permanent record of who competed; drives rejoin rules and the
  leaderboard's scoring window.
- **Scoring window** — the interval during which a participant's submissions count on a contest
  leaderboard: from join to leave, or to when the countdown would have ended.
  `buildScoringWindows`, `lib/contestScoring.ts`.
- **Leaderboard score** — Invariant 5: per problem, the best `passed/total` inside the window, capped
  at 1.0; never point-weighted. `scoreParticipants`, `lib/contestScoring.ts`.

## Submissions and the judge

- **Judge outcome** — the typed result of one judge call: `ok`, `httpError`, `unreadable`,
  `unreachable` (`lib/judge.ts`). Both judge-side failure modes (`compileError`, `checkerError`)
  arrive as `ok` HTTP 200 and are branched on by the caller; a non-ok outcome is never the student's
  fault.
- **Verdict** — one per submission, computed by `aggregateVerdict` (`components/VerdictBadge.tsx`)
  from the full per-case array plus the compile-error flag: `CE` first, then `IE`, `TLE`, `MLE`,
  `RE`, `WA`, else `AC`. `IE` ranks ahead of the student's own failures because a per-case `IE` is a
  broken problem, not a wrong answer. **Case verdict** — one per test, `caseVerdict`, derived from
  `passed`/`timedOut` for legacy rows that predate the field.
- **Submission record** — the pair of rows one submission becomes: the world-readable `submissions`
  row (redacted) and the owner+staff `submission_private` row. Written atomically by
  `record_submission()` via `recordSubmission` (`lib/submissionRecord.ts`); the outcome distinguishes
  "deliberately not stored" (inactive problem) from "should have been stored and wasn't".
- **Redaction** — the allowlist (`lib/submissionRedaction.ts`) that decides which per-case keys may
  appear on the public row. Allowlist, never denylist: `checkerMessage` quotes the answer.
- **Submission detail** — the one wire shape of `GET /api/{user,admin,manager}/submissions/[id]`
  (`SubmissionDetail`, `types/submission.ts`), read by `readSubmissionDetail`
  (`lib/submissionDetail.ts`) under the caller's own token and rendered by `SubmissionDetailModal`
  on all six surfaces.

## Staff

- **Staff tree** — one of the two staff route trees, `admin` or `manager`. The tree is a URL prefix
  plus a `StaffPolicy`; shared staff components take `tree` and derive both (`staffRoutes(tree)` for
  the URLs, `STAFF_POLICY[tree]` for the behaviour).
- **Staff policy** — the data record (`lib/staffPolicy.ts`) naming the four deliberate deltas between
  the trees. Nothing else may differ between twins.
