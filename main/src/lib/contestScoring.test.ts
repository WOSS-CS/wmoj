import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SOLVED_THRESHOLD,
  buildScoringWindows,
  rankLeaderboard,
  scoreParticipants,
  type JoinHistoryRow,
  type ScoredSubmissionRow,
} from '@/lib/contestScoring';

/**
 * The rules that decide who wins a contest. All of this lived inside a server
 * component where it could not be exercised without a live contest, a live
 * participant and a live submission.
 */

const iso = (ms: number) => new Date(ms).toISOString();

function join(overrides: Partial<JoinHistoryRow> = {}): JoinHistoryRow {
  return { user_id: 'u1', joined_at: iso(1_000), left_at: iso(2_000), ...overrides };
}

function sub(overrides: Partial<ScoredSubmissionRow> = {}): ScoredSubmissionRow {
  return {
    user_id: 'u1',
    problem_id: 'p1',
    created_at: iso(1_500),
    summary: { total: 10, passed: 10 },
    ...overrides,
  };
}

// ─── buildScoringWindows ──────────────────────────────────────────────────────

test('two join rows for one user merge into the union of their windows', () => {
  const windows = buildScoringWindows(
    [
      join({ joined_at: iso(5_000), left_at: iso(6_000) }),
      join({ joined_at: iso(1_000), left_at: iso(2_000) }),
    ],
    null,
    null,
  );
  assert.equal(windows.size, 1);
  assert.deepEqual(windows.get('u1'), { fromMs: 1_000, toMs: 6_000 });
});

test('each participant gets their own window', () => {
  const windows = buildScoringWindows(
    [join({ user_id: 'u1' }), join({ user_id: 'u2', joined_at: iso(9_000), left_at: iso(9_500) })],
    null,
    null,
  );
  assert.deepEqual(windows.get('u1'), { fromMs: 1_000, toMs: 2_000 });
  assert.deepEqual(windows.get('u2'), { fromMs: 9_000, toMs: 9_500 });
});

test('a null joined_at falls back to the contest start, then to -Infinity', () => {
  const withStart = buildScoringWindows([join({ joined_at: null })], 500, null);
  assert.equal(withStart.get('u1')?.fromMs, 500);

  const withoutStart = buildScoringWindows([join({ joined_at: null })], null, null);
  assert.equal(withoutStart.get('u1')?.fromMs, Number.NEGATIVE_INFINITY);
});

test('a null left_at ends at joined_at + length, or +Infinity with no length', () => {
  const withLength = buildScoringWindows([join({ left_at: null })], null, 60_000);
  assert.deepEqual(withLength.get('u1'), { fromMs: 1_000, toMs: 61_000 });

  const withoutLength = buildScoringWindows([join({ left_at: null })], null, null);
  assert.equal(withoutLength.get('u1')?.toMs, Number.POSITIVE_INFINITY);
});

test('a null left_at on an unbounded start is +Infinity even with a length', () => {
  // joined_at is -Infinity here, so `joined + length` is not a real instant.
  const windows = buildScoringWindows([join({ joined_at: null, left_at: null })], null, 60_000);
  assert.deepEqual(windows.get('u1'), { fromMs: Number.NEGATIVE_INFINITY, toMs: Number.POSITIVE_INFINITY });
});

test('a row with no user_id is skipped', () => {
  const windows = buildScoringWindows([join({ user_id: '' })], null, null);
  assert.equal(windows.size, 0);
});

// ─── scoreParticipants ────────────────────────────────────────────────────────

const WINDOWS = new Map([['u1', { fromMs: 1_000, toMs: 2_000 }]]);
const PROBLEMS = new Set(['p1', 'p2']);

test('both ends of the window are inclusive, one millisecond outside is not', () => {
  const inside = scoreParticipants(
    [sub({ created_at: iso(1_000) }), sub({ problem_id: 'p2', created_at: iso(2_000) })],
    WINDOWS,
    PROBLEMS,
  );
  assert.equal(inside.get('u1')?.totalScore, 2);

  const outside = scoreParticipants(
    [sub({ created_at: iso(999) }), sub({ problem_id: 'p2', created_at: iso(2_001) })],
    WINDOWS,
    PROBLEMS,
  );
  assert.equal(outside.size, 0);
});

test('a submission with no created_at is ignored', () => {
  assert.equal(scoreParticipants([sub({ created_at: null })], WINDOWS, PROBLEMS).size, 0);
});

test('a solve on a problem outside the contest is ignored', () => {
  // Contest problems stay solvable as standalone practice; practice on a
  // problem that is not in this contest must not score.
  assert.equal(scoreParticipants([sub({ problem_id: 'other' })], WINDOWS, PROBLEMS).size, 0);
});

test('a submission from a non-participant is ignored', () => {
  // An empty participant set means nobody is ranked, never "rank everyone".
  assert.equal(scoreParticipants([sub({ user_id: 'stranger' })], WINDOWS, PROBLEMS).size, 0);
  assert.equal(scoreParticipants([sub()], new Map(), PROBLEMS).size, 0);
});

test('INVARIANT 5: the best attempt on one problem counts once, not the sum', () => {
  const scores = scoreParticipants(
    [
      sub({ summary: { total: 10, passed: 3 } }),
      sub({ summary: { total: 10, passed: 7 } }),
      sub({ summary: { total: 10, passed: 5 } }),
    ],
    WINDOWS,
    PROBLEMS,
  );
  assert.equal(scores.get('u1')?.totalScore, 0.7);
  assert.deepEqual([...(scores.get('u1')?.problemScores ?? [])], [['p1', 0.7]]);
});

test('two fully-solved problems total 2.0 — a problem is worth at most 1.0', () => {
  const scores = scoreParticipants(
    [sub({ problem_id: 'p1' }), sub({ problem_id: 'p2' })],
    WINDOWS,
    PROBLEMS,
  );
  assert.equal(scores.get('u1')?.totalScore, 2);
  assert.equal(scores.get('u1')?.problemScores.size, 2);
});

test('a summary with total 0 scores 0, and so does a malformed one', () => {
  for (const summary of [{ total: 0, passed: 0 }, null, 'CE', { passed: 5 }, [1, 2]]) {
    const scores = scoreParticipants([sub({ summary })], WINDOWS, PROBLEMS);
    assert.equal(scores.get('u1')?.totalScore, 0, `for ${JSON.stringify(summary)}`);
  }
});

test('a fully-passed problem clears SOLVED_THRESHOLD even with float division', () => {
  // 3/3 is 0.9999999999999998 in IEEE 754, which is why the threshold is not 1.
  const scores = scoreParticipants([sub({ summary: { total: 3, passed: 3 } })], WINDOWS, PROBLEMS);
  const score = scores.get('u1')?.problemScores.get('p1') ?? 0;
  assert.ok(score >= SOLVED_THRESHOLD, `${score} should count as solved`);
});

// ─── rankLeaderboard ──────────────────────────────────────────────────────────

function entry(username: string, total_score: number, solved_problems = 0) {
  return { user_id: username, username, total_score, solved_problems, total_problems: 3 };
}

test('the board is ordered by score descending and numbered from 1', () => {
  const ranked = rankLeaderboard([entry('b', 1), entry('a', 3), entry('c', 2)]);
  assert.deepEqual(ranked.map((e) => e.username), ['a', 'c', 'b']);
  assert.deepEqual(ranked.map((e) => e.rank), [1, 2, 3]);
});

test('scores within 0.001 tie and fall through to solved_problems', () => {
  const ranked = rankLeaderboard([entry('a', 2.0), entry('b', 2.0005, 2)]);
  assert.deepEqual(ranked.map((e) => e.username), ['b', 'a']);
  assert.deepEqual(ranked.map((e) => e.rank), [1, 2]);
});

test('a full tie falls through to username, so the order is stable', () => {
  const ranked = rankLeaderboard([entry('zoe', 2, 1), entry('adam', 2, 1)]);
  assert.deepEqual(ranked.map((e) => e.username), ['adam', 'zoe']);
});

test('a score difference over 0.001 outranks solved_problems', () => {
  const ranked = rankLeaderboard([entry('a', 2.5, 0), entry('b', 2.0, 2)]);
  assert.deepEqual(ranked.map((e) => e.username), ['a', 'b']);
});

test('ranking does not mutate its argument', () => {
  const input = [entry('b', 1), entry('a', 3)];
  rankLeaderboard(input);
  assert.deepEqual(input.map((e) => e.username), ['b', 'a']);
});
