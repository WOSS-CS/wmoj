import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compileErrorOf,
  isAcceptedSummary,
  summaryForStorage,
} from '@/lib/submissionRecord';

/**
 * The three pure decisions behind a stored submission. Between them they decide
 * whether points are recalculated (Invariant 2) and what the world-readable
 * `submissions.summary` says, so each edge below is a real outcome for a real
 * student rather than a shape exercise.
 */

// ── compileErrorOf ──────────────────────────────────────────────────────────

test('a compile error is a NON-EMPTY string and nothing else', () => {
  assert.equal(compileErrorOf({ compileError: 'error: expected ;' }), 'error: expected ;');
  assert.equal(compileErrorOf({ compileError: '' }), null);
  assert.equal(compileErrorOf({ compileError: undefined }), null);
  assert.equal(compileErrorOf({}), null);
});

// ── isAcceptedSummary ───────────────────────────────────────────────────────

test('all tests passed is accepted', () => {
  assert.equal(isAcceptedSummary({ total: 10, failed: 0 }, false), true);
});

test('a compile error is never accepted, even with a zero-failure summary', () => {
  // The judge sends {0,0,0} on a CE. Without the CE flag this would read as
  // "nothing failed", and awarding a solve for code that never compiled is the
  // exact bug the flag exists to stop.
  assert.equal(isAcceptedSummary({ total: 10, failed: 0 }, true), false);
  assert.equal(isAcceptedSummary({ total: 0, failed: 0 }, true), false);
});

test('zero tests is not a solve', () => {
  assert.equal(isAcceptedSummary({ total: 0, failed: 0 }, false), false);
});

test('any failure is not a solve', () => {
  assert.equal(isAcceptedSummary({ total: 10, failed: 1 }, false), false);
  assert.equal(isAcceptedSummary({ total: 10, failed: 10 }, false), false);
});

test('an unreadable summary is not a solve', () => {
  assert.equal(isAcceptedSummary(null, false), false);
  assert.equal(isAcceptedSummary(undefined, false), false);
  // A missing `failed` counts as a failure, not as zero.
  assert.equal(isAcceptedSummary({ total: 10 }, false), false);
  // A missing `total` counts as no tests, not as some.
  assert.equal(isAcceptedSummary({ failed: 0 }, false), false);
});

// ── summaryForStorage ───────────────────────────────────────────────────────

const JUDGE_SUMMARY = { total: 10, passed: 7, failed: 3 };

test('a normal summary is passed through with no verdict added', () => {
  const stored = summaryForStorage(JUDGE_SUMMARY, false);
  assert.deepEqual(stored, { total: 10, passed: 7, failed: 3 });
  assert.equal(stored && 'verdict' in stored, false);
});

test('a compile error adds the public CE marker', () => {
  // The marker is what the five staff list pages badge a submission CE from,
  // since the message itself now lives on the private row.
  assert.deepEqual(summaryForStorage({ total: 0, passed: 0, failed: 0 }, true), {
    total: 0,
    passed: 0,
    failed: 0,
    verdict: 'CE',
  });
});

test('a compile error with no judge summary defaults to 0/0/0 plus the marker', () => {
  assert.deepEqual(summaryForStorage(undefined, true), {
    total: 0,
    passed: 0,
    failed: 0,
    verdict: 'CE',
  });
  assert.deepEqual(summaryForStorage(null, true), {
    total: 0,
    passed: 0,
    failed: 0,
    verdict: 'CE',
  });
});

test('no summary and no compile error stores nothing, not a fabricated 0/0/0', () => {
  // A fabricated zero summary would be indistinguishable from a real run of no
  // tests, and `submissions.status` is GENERATED from exactly those two keys.
  assert.equal(summaryForStorage(null, false), null);
  assert.equal(summaryForStorage(undefined, false), null);
});

test('the compile MESSAGE is never added to the public summary', () => {
  // The message quotes the offending source lines, so publishing it would
  // publish the student's code by another route. The code this replaces DID
  // put it here and relied on `redactSummary` to take it back out again.
  const stored = summaryForStorage({ total: 0, passed: 0, failed: 0 }, true);
  assert.equal(stored && 'compileError' in stored, false);
});

test('unknown keys on the judge summary survive — redactSummary is the allowlist', () => {
  // This function is a spread, not a filter, and that division is deliberate:
  // the allowlist that decides what may be published lives in exactly one
  // place, and `recordSubmission` runs it on the way to the public column.
  const stored = summaryForStorage(
    { total: 1, passed: 1, failed: 0, checkerMessage: "expected '42'" } as unknown as typeof JUDGE_SUMMARY,
    false,
  );
  assert.equal(stored && 'checkerMessage' in stored, true);
});

test('the judge summary object is copied, never aliased', () => {
  const source = { total: 1, passed: 1, failed: 0 };
  const stored = summaryForStorage(source, true);
  assert.notEqual(stored, source);
  assert.equal('verdict' in source, false, 'the caller\'s object must not gain a verdict');
});
