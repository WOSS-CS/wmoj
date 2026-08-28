import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeSubmission } from '@/lib/queries/submissions';

/**
 * `submissions.summary` is `jsonb`, so every shape below is one this function
 * can actually be handed. Six `page.tsx` files used to re-derive these three
 * values by hand and they had already drifted on the "Unknown" fallback and on
 * whether `verdict` was read at all.
 *
 * `resolveSubmissionNames` takes a `SupabaseClient` and is deliberately
 * untested — see plan §3.1. Only the pure half is pinned here.
 */

test('a compile-error summary reports CE and an em-dash score', () => {
  // What the submit route stores for a compile error: nothing ran, and the
  // message itself is private (it lives on `submission_private`).
  const view = summarizeSubmission({ total: 0, passed: 0, failed: 0, verdict: 'CE' });
  assert.equal(view.isCompileError, true);
  assert.equal(view.score, '—');
  assert.deepEqual([view.total, view.passed, view.failed], [0, 0, 0]);
});

test('a null summary is zeros, not a crash', () => {
  const view = summarizeSubmission(null);
  assert.deepEqual(view, { total: 0, passed: 0, failed: 0, score: '—', isCompileError: false });
});

test('counts stored as strings coerce to numbers', () => {
  // Historical rows really do carry string counts.
  const view = summarizeSubmission({ total: '10', passed: '7', failed: '3' });
  assert.deepEqual([view.total, view.passed, view.failed], [10, 7, 3]);
  assert.equal(view.score, '7/10');
});

test('passed greater than total is passed through, not clamped', () => {
  // The page shows what was stored: a row where these disagree is a judging
  // defect worth seeing rather than hiding behind a Math.min.
  const view = summarizeSubmission({ total: 2, passed: 5, failed: 0 });
  assert.equal(view.score, '5/2');
  assert.equal(view.passed, 5);
});

test('an all-passing summary scores passed/total and is not a compile error', () => {
  const view = summarizeSubmission({ total: 12, passed: 12, failed: 0 });
  assert.equal(view.score, '12/12');
  assert.equal(view.isCompileError, false);
});

test('a summary that is not an object reads as zeros', () => {
  // `jsonb` can hold a scalar or an array; neither is a summary.
  for (const value of ['CE', 42, true, [], [{ total: 3 }]]) {
    const view = summarizeSubmission(value);
    assert.deepEqual([view.total, view.passed, view.failed], [0, 0, 0], `for ${JSON.stringify(value)}`);
    assert.equal(view.score, '—');
    assert.equal(view.isCompileError, false);
  }
});

test('an uncoercible count reads as zero rather than NaN', () => {
  // `Number('abc')` is NaN and NaN renders as the string "NaN" in a table cell.
  const view = summarizeSubmission({ total: 'abc', passed: {}, failed: undefined });
  assert.deepEqual([view.total, view.passed, view.failed], [0, 0, 0]);
  assert.equal(view.score, '—');
});

test('the CE flag reads `verdict`, and no other verdict sets it', () => {
  assert.equal(summarizeSubmission({ total: 3, passed: 0, verdict: 'WA' }).isCompileError, false);
  assert.equal(summarizeSubmission({ total: 0, passed: 0, verdict: 'ce' }).isCompileError, false);
  assert.equal(summarizeSubmission({ total: 0, passed: 0, verdict: 'CE' }).isCompileError, true);
});
