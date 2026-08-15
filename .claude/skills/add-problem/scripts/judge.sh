#!/usr/bin/env bash
#
# judge.sh — talk to the LIVE wmoj-judge from the command line.
#
# The live judge is the only judge this script will ever talk to. There is no
# flag to point it at localhost, because a problem that passes on a local judge
# has proven nothing: the whole point of the exercise is to show that the
# generator and the tests fit inside the 512 MB / ~0.1 CPU Render instance that
# actually grades submissions.
#
# Usage:
#   judge.sh health
#   judge.sh generate <generator.cpp> <tests.json>
#   judge.sh check    <tests.json>
#   judge.sh submit   <solution-file> <language> <tests.json> <timeLimitMs> <memLimitMb> [results.json]
#
# generate  compiles and runs a generator on the live judge and writes
#           {"input": [...], "output": [...]} to <tests.json>.
# check     validates <tests.json> against the judge's hard caps locally, so a
#           doomed payload is caught before it burns a round trip.
# submit    runs a solution against every case in <tests.json>. Exits non-zero
#           unless all cases are AC, so it works as a gate in a chain.
#
# Credentials come from wmoj-app/main/.env.local (NEXT_PUBLIC_JUDGE_URL and
# JUDGE_SHARED_SECRET), or from those same names already exported in the
# environment, which take precedence.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ENV_FILE="$REPO_ROOT/main/.env.local"

# Caps enforced by wmoj-judge/src/middleware/requestCaps.ts. Kept in sync by
# hand; a mismatch here only changes where you find out, not whether you do.
MAX_CASES=200
MAX_BYTES_PER_CASE=1000000
MAX_CODE_BYTES=100000

die() { printf 'judge.sh: %s\n' "$*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not installed"; }

# Read one KEY=value out of .env.local. Values there may carry trailing
# whitespace (NEXT_PUBLIC_JUDGE_URL currently does), which would corrupt both
# the URL and the auth header, so strip it.
read_env() {
  local key="$1"
  [ -f "$ENV_FILE" ] || die "cannot find $ENV_FILE — run this from a checkout of wmoj-app"
  sed -n "s/^${key}=//p" "$ENV_FILE" | head -1 | tr -d '[:space:]'
}

load_creds() {
  need curl
  need jq
  JUDGE_URL="${NEXT_PUBLIC_JUDGE_URL:-$(read_env NEXT_PUBLIC_JUDGE_URL)}"
  JUDGE_TOKEN="${JUDGE_SHARED_SECRET:-$(read_env JUDGE_SHARED_SECRET)}"
  JUDGE_URL="${JUDGE_URL%/}"
  [ -n "$JUDGE_URL" ] || die "NEXT_PUBLIC_JUDGE_URL is empty"
  [ -n "$JUDGE_TOKEN" ] || die "JUDGE_SHARED_SECRET is empty"
  case "$JUDGE_URL" in
    http://localhost*|http://127.0.0.1*|http://0.0.0.0*)
      die "NEXT_PUBLIC_JUDGE_URL points at a local judge ($JUDGE_URL).
Problems must be verified against the deployed judge. Set NEXT_PUBLIC_JUDGE_URL
to the Render URL (https://wmoj-judge.onrender.com) and try again." ;;
  esac
}

cmd_health() {
  load_creds
  local code
  code=$(curl -sS -o /tmp/judge_health.$$ -w '%{http_code}' --max-time 120 "$JUDGE_URL/health")
  cat /tmp/judge_health.$$; echo; rm -f /tmp/judge_health.$$
  [ "$code" = "200" ] || die "judge is not healthy (HTTP $code)"
}

cmd_generate() {
  local src="${1:?usage: judge.sh generate <generator.cpp> <tests.json>}"
  local dest="${2:?usage: judge.sh generate <generator.cpp> <tests.json>}"
  load_creds
  [ -f "$src" ] || die "no such file: $src"

  local bytes; bytes=$(wc -c <"$src" | tr -d ' ')
  [ "$bytes" -le "$MAX_CODE_BYTES" ] || die "generator is ${bytes}B, over the ${MAX_CODE_BYTES}B source cap"

  local req resp code
  req=$(mktemp); resp=$(mktemp)
  jq -Rs --arg lang cpp '{language: $lang, code: .}' "$src" >"$req"
  # The generator gets 60s of wall clock on the judge; allow for a cold Render
  # dyno on top of that.
  code=$(curl -sS -o "$resp" -w '%{http_code}' --max-time 300 \
    -X POST "$JUDGE_URL/generate-tests" \
    -H 'Content-Type: application/json' \
    -H "X-Judge-Token: $JUDGE_TOKEN" \
    --data-binary @"$req")
  rm -f "$req"

  if [ "$code" != "200" ]; then
    printf 'generate-tests failed (HTTP %s):\n' "$code" >&2
    jq -r '.error // .' "$resp" >&2 || cat "$resp" >&2
    rm -f "$resp"; exit 1
  fi

  jq '{input: .input, output: .output}' "$resp" >"$dest"
  rm -f "$resp"
  printf 'wrote %s (%s cases)\n' "$dest" "$(jq '.input | length' "$dest")"
  cmd_check "$dest"
}

cmd_check() {
  local tests="${1:?usage: judge.sh check <tests.json>}"
  need jq
  [ -f "$tests" ] || die "no such file: $tests"

  jq -e '(.input | type) == "array" and (.output | type) == "array"' "$tests" >/dev/null \
    || die "$tests must be {\"input\": [...], \"output\": [...]}"
  jq -e '(.input | length) == (.output | length)' "$tests" >/dev/null \
    || die "input and output arrays differ in length"
  jq -e '[.input[], .output[]] | all(type == "string")' "$tests" >/dev/null \
    || die "every element of input[] and output[] must be a string"

  local n max_in max_out total
  n=$(jq '.input | length' "$tests")
  max_in=$(jq '[.input[] | utf8bytelength] | max // 0' "$tests")
  max_out=$(jq '[.output[] | utf8bytelength] | max // 0' "$tests")
  total=$(jq '[.input[], .output[] | utf8bytelength] | add // 0' "$tests")

  printf 'cases=%s  largest input=%sB  largest output=%sB  total=%sB\n' \
    "$n" "$max_in" "$max_out" "$total"

  [ "$n" -ge 1 ] || die "at least one test case is required"
  [ "$n" -le "$MAX_CASES" ] || die "$n cases exceeds the ${MAX_CASES}-case cap"
  [ "$max_in" -le "$MAX_BYTES_PER_CASE" ] || die "largest input ${max_in}B exceeds the 1MB per-case cap"
  [ "$max_out" -le "$MAX_BYTES_PER_CASE" ] || die "largest output ${max_out}B exceeds the 1MB per-case cap"

  # Not a judge cap — a house rule. The biggest problem on WMOJ that actually
  # works totals ~1.2MB; past that the Render instance starts to struggle even
  # though nothing formally rejects the payload.
  if [ "$total" -gt 1500000 ]; then
    printf 'warning: %sB total is larger than any problem currently on WMOJ — consider trimming\n' "$total" >&2
  fi
}

cmd_submit() {
  local sol="${1:?usage: judge.sh submit <solution> <language> <tests.json> <timeLimitMs> <memLimitMb> [results.json]}"
  local lang="${2:?missing language}"
  local tests="${3:?missing tests.json}"
  local tl="${4:?missing timeLimitMs}"
  local ml="${5:?missing memLimitMb}"
  local dest="${6:-}"
  load_creds
  [ -f "$sol" ] || die "no such file: $sol"
  [ -f "$tests" ] || die "no such file: $tests"

  local req resp code keep
  req=$(mktemp)
  if [ -n "$dest" ]; then resp="$dest"; keep=1; else resp=$(mktemp); keep=0; fi

  jq -n --rawfile code "$sol" --slurpfile t "$tests" \
        --arg lang "$lang" --argjson tl "$tl" --argjson ml "$ml" \
    '{language: $lang, code: $code, input: $t[0].input, output: $t[0].output,
      timeLimit: $tl, memoryLimit: $ml}' >"$req"

  # Cases run serially on one shared vCPU, so a 200-case set at a 3s limit can
  # legitimately take minutes. Be patient rather than reporting a false failure.
  code=$(curl -sS -o "$resp" -w '%{http_code}' --max-time 900 \
    -X POST "$JUDGE_URL/submit" \
    -H 'Content-Type: application/json' \
    -H "X-Judge-Token: $JUDGE_TOKEN" \
    --data-binary @"$req")
  rm -f "$req"

  if [ "$code" != "200" ]; then
    printf 'submit failed (HTTP %s):\n' "$code" >&2
    jq -r '.error // .' "$resp" >&2 || cat "$resp" >&2
    [ "$keep" = 1 ] || rm -f "$resp"
    exit 1
  fi

  # A compile error is HTTP 200 with an empty summary — check it first.
  if jq -e '.compileError != null' "$resp" >/dev/null; then
    printf 'COMPILE ERROR:\n' >&2
    jq -r '.compileError' "$resp" >&2
    [ "$keep" = 1 ] || rm -f "$resp"
    exit 1
  fi

  jq -r '"\(.summary.passed)/\(.summary.total) passed"' "$resp"
  jq -r '[.results[] | select(.passed | not)]
         | .[0:5][]
         | "  case \(.index): \(.verdict)  expected=\(.expected[0:60] | @json)  got=\(.stdout[0:60] | @json)"' "$resp"
  # Headroom matters more than the verdict: a solution that only just fits is a
  # TLE waiting to happen the next time Render gives us a busier neighbour.
  jq -r --argjson tl "$tl" \
    '"slowest case: \([.results[].timeMs] | max // 0)ms of the \($tl)ms limit"' "$resp"

  local failed; failed=$(jq '.summary.failed' "$resp")
  [ "$keep" = 1 ] || rm -f "$resp"
  [ "$failed" = "0" ] || die "$failed case(s) failed — the problem is not ready to publish"
}

case "${1:-}" in
  health)   shift; cmd_health "$@" ;;
  generate) shift; cmd_generate "$@" ;;
  check)    shift; cmd_check "$@" ;;
  submit)   shift; cmd_submit "$@" ;;
  *) sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
