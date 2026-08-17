#!/usr/bin/env bash
#
# judge-lock.sh — serialize live-judge access across concurrent agents.
#
# Wraps judge.sh with a mutex so that several agents can work on different
# problems at the same time without ever running two jobs on the judge at once.
#
# Why this exists: the live judge is one free Render instance with 512 MB of RAM
# and roughly a tenth of a CPU, and it runs a submission's test cases serially.
# It decides TLE from CPU time with a wall-clock backstop at 3x the limit. Two
# concurrent jobs therefore do not just run slower, they change each other's
# verdicts — a correct solution starts tripping the wall-clock backstop, and a
# g++ run on bits/stdc++.h can get OOM-killed and report as a compile error.
# Either way the agent "fixes" a problem that was never broken, by inflating a
# time limit or shrinking test data, and the damage is stored permanently.
#
# There is no throughput cost to this. The judge can only do one job at a time
# regardless, so serializing the judge calls leaves total judge time unchanged;
# it only stops the results from being garbage. Everything that is not a judge
# call — reading sources, writing statements and generators, database work —
# still runs fully in parallel.
#
# Usage: identical to judge.sh, which it forwards to.
#   judge-lock.sh generate <generator.cpp> <tests.json>
#   judge-lock.sh submit   <solution> <language> <tests.json> <timeLimitMs> <memLimitMb> [results.json]
#
# 'health' and 'check' bypass the lock: check is purely local, and health is a
# trivial GET that cannot perturb a running job.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JUDGE="$HERE/judge.sh"

# One fixed path so every agent contends for the same lock.
LOCK_DIR="${WMOJ_JUDGE_LOCK:-/private/tmp/claude-501/-Users-adham-Developer-wmoj-wmoj-app/3f21d6db-9e39-4477-acf4-59a001c47be6/scratchpad/judge.lock}"

# judge.sh allows curl up to 900s for a submit and 300s for a generate. A lock
# held longer than that belongs to an agent that died, not one still working.
STALE_SECONDS=1200
# 56 problems x ~4 judge calls, all through this lock, is a long queue. Wait
# generously rather than failing a problem that was only ever waiting its turn.
WAIT_TIMEOUT=21600
POLL_SECONDS=5

die() { printf 'judge-lock.sh: %s\n' "$*" >&2; exit 1; }

case "${1:-}" in
  health|check) exec "$JUDGE" "$@" ;;
  generate|submit) ;;
  *) exec "$JUDGE" "$@" ;;
esac

mkdir -p "$(dirname "$LOCK_DIR")"

acquired=0
release() {
  if [ "$acquired" = 1 ]; then
    rm -rf "$LOCK_DIR"
    acquired=0
  fi
}
trap release EXIT INT TERM

waited=0
while :; do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    acquired=1
    printf '%s %s %s\n' "$$" "$(date +%s)" "${WMOJ_AGENT:-unknown}" >"$LOCK_DIR/owner"
    break
  fi

  # Break a lock whose owner is long gone, so one dead agent cannot wedge the
  # whole run. The threshold is above the longest legitimate judge call.
  if [ -f "$LOCK_DIR/owner" ]; then
    held_since=$(awk '{print $2}' "$LOCK_DIR/owner" 2>/dev/null || echo 0)
    now=$(date +%s)
    case "$held_since" in
      ''|*[!0-9]*) held_since=0 ;;
    esac
    if [ "$held_since" -gt 0 ] && [ "$((now - held_since))" -gt "$STALE_SECONDS" ]; then
      printf 'judge-lock.sh: breaking stale lock held since %s\n' "$held_since" >&2
      rm -rf "$LOCK_DIR"
      continue
    fi
  fi

  [ "$waited" -lt "$WAIT_TIMEOUT" ] || die "timed out after ${WAIT_TIMEOUT}s waiting for the judge lock"
  sleep "$POLL_SECONDS"
  waited=$((waited + POLL_SECONDS))
done

if [ "$waited" -gt 0 ]; then
  printf 'judge-lock.sh: acquired the judge after waiting %ss\n' "$waited" >&2
fi

set +e
"$JUDGE" "$@"
status=$?
set -e

release
exit "$status"
