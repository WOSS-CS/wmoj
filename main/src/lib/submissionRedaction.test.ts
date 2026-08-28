import assert from 'node:assert/strict';
import test from 'node:test';

import type { Json } from '@/types/supabase';

import {
  PUBLIC_RESULT_KEYS,
  PUBLIC_SUMMARY_KEYS,
  redactSummary,
  redactTestResults,
} from '@/lib/submissionRedaction';

/**
 * The allowlist that keeps the answer key off the world-readable
 * `public.submissions` table. The key lists are asserted LITERALLY, on purpose:
 * a denylist would republish `checkerMessage` (checker stderr quotes the
 * expected output), so growing the allowlist has to be a deliberate edit here
 * as well as in `submissionRedaction.ts` and in the SQL that backfilled the
 * already-stored rows.
 */

/** One fully-populated case, as the current judge emits it. */
function judgeCase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    index: 3,
    passed: false,
    verdict: 'WA',
    timedOut: false,
    exitCode: 0,
    expected: '42',
    received: '17',
    stdout: '17\n',
    stderr: '',
    timeMs: 12,
    cpuMs: 11,
    memKb: 2048,
    truncated: false,
    checkerMessage: "expected '42', found '17'",
    ...overrides,
  };
}

const PRIVATE_KEYS = [
  'expected',
  'received',
  'stdout',
  'stderr',
  'checkerMessage',
  'timeMs',
  'cpuMs',
  'memKb',
  'truncated',
] as const;

test('PUBLIC_RESULT_KEYS is exactly the five publishable per-case keys', () => {
  assert.deepEqual(
    [...PUBLIC_RESULT_KEYS],
    ['verdict', 'passed', 'index', 'timedOut', 'exitCode'],
  );
});

test('PUBLIC_SUMMARY_KEYS is exactly the four publishable summary keys', () => {
  assert.deepEqual([...PUBLIC_SUMMARY_KEYS], ['total', 'passed', 'failed', 'verdict']);
});

test('redactTestResults keeps the five public keys and their values', () => {
  const [out] = redactTestResults([judgeCase()]);
  assert.deepEqual(out, {
    index: 3,
    passed: false,
    verdict: 'WA',
    timedOut: false,
    exitCode: 0,
  });
});

test('redactTestResults drops every private key, checkerMessage included', () => {
  const [out] = redactTestResults([judgeCase()]);
  for (const key of PRIVATE_KEYS) {
    assert.equal(key in out, false, `${key} must not survive redaction`);
  }
});

test('redactTestResults preserves order and length', () => {
  const input = [judgeCase({ index: 0 }), judgeCase({ index: 1 }), judgeCase({ index: 2 })];
  const out = redactTestResults(input);
  assert.equal(out.length, 3);
  assert.deepEqual(
    out.map((element) => element.index),
    [0, 1, 2],
  );
});

test('redactTestResults replaces a non-object element with {} rather than dropping it', () => {
  const out = redactTestResults([judgeCase({ index: 0 }), null, 'nope', 7]);
  assert.equal(out.length, 4);
  assert.deepEqual(out[1], {});
  assert.deepEqual(out[2], {});
  assert.deepEqual(out[3], {});
});

test('redactTestResults omits a public key that is absent rather than writing undefined', () => {
  const [out] = redactTestResults([{ index: 0, passed: true }]);
  assert.deepEqual(out, { index: 0, passed: true });
  assert.equal('verdict' in out, false);
});

test('redactTestResults returns [] for a non-array', () => {
  assert.deepEqual(redactTestResults(null), []);
  assert.deepEqual(redactTestResults(undefined), []);
  assert.deepEqual(redactTestResults({ 0: judgeCase() }), []);
  assert.deepEqual(redactTestResults('[]'), []);
});

test('redactSummary keeps total/passed/failed/verdict and drops compileError', () => {
  const out = redactSummary({
    total: 12,
    passed: 11,
    failed: 1,
    verdict: 'CE',
    compileError: "main.cpp:4:1: error: 'retrun' was not declared",
  });
  assert.deepEqual(out, { total: 12, passed: 11, failed: 1, verdict: 'CE' });
});

test('redactSummary keeps the CE marker, which the staff list pages badge from', () => {
  const out = redactSummary({ verdict: 'CE', compileError: 'boom' });
  assert.deepEqual(out, { verdict: 'CE' });
});

test('redactSummary returns null for null, undefined and a non-object', () => {
  assert.equal(redactSummary(null), null);
  assert.equal(redactSummary(undefined), null);
  // The runtime guard exists for JSON that arrives off the wire, which the
  // parameter type cannot describe; the cast is what lets the test reach it.
  assert.equal(redactSummary('total' as unknown as Record<string, Json>), null);
  assert.equal(redactSummary(0 as unknown as Record<string, Json>), null);
});
