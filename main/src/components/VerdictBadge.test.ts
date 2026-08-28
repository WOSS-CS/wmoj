import assert from 'node:assert/strict';
import test from 'node:test';

import { aggregateVerdict, caseVerdict } from '@/components/VerdictBadge';
import type { TestResult, Verdict } from '@/types/judge';

/**
 * The verdict rule the six submission-detail views now share.
 *
 * Three of them used to hand-roll `compileError ? "Compile Error" : isAccepted
 * ? 'Accepted' : 'Failed'`, which read "Failed" for TLE, MLE, RE and IE alike.
 * They all call `aggregateVerdict` now, so the ranking below is the one rule —
 * and 'IE' being FIRST is the part worth pinning: a per-case 'IE' means a
 * custom checker could not answer, which is a broken problem rather than a
 * wrong answer, and it must not be hidden behind the student's own failures.
 */

function testCase(overrides: Partial<TestResult> = {}): TestResult {
  return {
    index: 0,
    passed: true,
    verdict: 'AC',
    timedOut: false,
    exitCode: 0,
    expected: '',
    received: '',
    stdout: '',
    stderr: '',
    ...overrides,
  };
}

const failing = (verdict: Verdict) => testCase({ passed: false, verdict });

test('a compile error wins over everything, including the results array', () => {
  assert.equal(aggregateVerdict([testCase()], 'error: expected ;'), 'CE');
  assert.equal(aggregateVerdict([failing('TLE')], 'error: expected ;'), 'CE');
});

test('all cases passing is AC', () => {
  assert.equal(aggregateVerdict([testCase(), testCase({ index: 1 })], null), 'AC');
});

test('IE outranks every other failure', () => {
  assert.equal(aggregateVerdict([failing('WA'), failing('IE'), failing('TLE')], null), 'IE');
  assert.equal(aggregateVerdict([failing('IE'), failing('IE')], null), 'IE');
});

test('the remaining ranking is TLE > MLE > RE > WA', () => {
  assert.equal(aggregateVerdict([failing('WA'), failing('TLE')], null), 'TLE');
  assert.equal(aggregateVerdict([failing('WA'), failing('MLE')], null), 'MLE');
  assert.equal(aggregateVerdict([failing('WA'), failing('RE')], null), 'RE');
  assert.equal(aggregateVerdict([failing('MLE'), failing('TLE')], null), 'TLE');
});

test('an empty or missing results array is IE, not AC', () => {
  // No cases and no compile error means the judge told us nothing usable.
  assert.equal(aggregateVerdict([], null), 'IE');
  assert.equal(aggregateVerdict(null, null), 'IE');
  assert.equal(aggregateVerdict(undefined, null), 'IE');
});

test('legacy rows with no verdict field fall back to pass/fail and timedOut', () => {
  // These arrays arrive as untyped JSON and are cast, not validated, so a row
  // written before `verdict` existed genuinely lacks the key.
  const legacyFail = { index: 0, passed: false, timedOut: false } as unknown as TestResult;
  const legacyTimeout = { index: 1, passed: false, timedOut: true } as unknown as TestResult;
  const legacyPass = { index: 2, passed: true, timedOut: false } as unknown as TestResult;

  assert.equal(aggregateVerdict([legacyFail], null), 'WA');
  assert.equal(aggregateVerdict([legacyTimeout], null), 'TLE');
  assert.equal(aggregateVerdict([legacyPass], null), 'AC');
  // The first failure decides, and a timeout ahead of a plain failure still reads TLE.
  assert.equal(aggregateVerdict([legacyTimeout, legacyFail], null), 'TLE');
});

test('caseVerdict prefers the judge s own verdict and derives one otherwise', () => {
  assert.equal(caseVerdict(failing('MLE')), 'MLE');
  assert.equal(caseVerdict(testCase()), 'AC');
  // Same legacy shape as above: no `verdict` key at all, so the cast is the
  // only way to hand the function a row the type says cannot exist.
  assert.equal(caseVerdict({ passed: true, timedOut: false } as unknown as TestResult), 'AC');
  assert.equal(caseVerdict({ passed: false, timedOut: false } as unknown as TestResult), 'WA');
  assert.equal(caseVerdict({ passed: false, timedOut: true } as unknown as TestResult), 'TLE');
});
