import assert from 'node:assert/strict';
import test from 'node:test';

import { remainingSeconds } from '@/lib/contestTimer';

/**
 * `remainingSeconds` is the whole of Invariant 4's arithmetic, and it has to
 * fail CLOSED: every state it cannot read must come out as 0, because
 * `readTimer` turns `<= 0` into `expired` and the contest gate turns `expired`
 * into "no access". A single wrong sign here either locks a competitor out of
 * a live contest or lets an expired one keep submitting.
 */

const START = '2026-08-28T12:00:00.000Z';
const START_MS = Date.parse(START);
const MINUTE_MS = 60_000;

test('a full 60-minute window has just started', () => {
  assert.equal(remainingSeconds(START, 60, START_MS), 3600);
});

test('one second before the window closes leaves exactly one second', () => {
  assert.equal(remainingSeconds(START, 60, START_MS + 60 * MINUTE_MS - 1000), 1);
});

test('the boundary is inclusive: elapsed === duration is 0, not 1', () => {
  assert.equal(remainingSeconds(START, 60, START_MS + 60 * MINUTE_MS), 0);
});

test('a partial second still counts as a second remaining, never as zero', () => {
  // Elapsed floors, so a run with 0.5s left reports 1 and stays UNEXPIRED for
  // that last fraction. Rounding the other way would expire a competitor up to
  // a second early, which the countdown UI would render as a jump to 0.
  assert.equal(remainingSeconds(START, 60, START_MS + 60 * MINUTE_MS - 500), 1);
  assert.equal(remainingSeconds(START, 60, START_MS + 60 * MINUTE_MS - 1500), 2);
});

test('a start in the future (clock skew) is clamped to the full duration, never more', () => {
  assert.equal(remainingSeconds(START, 60, START_MS - 1000), 3600);
  assert.equal(remainingSeconds(START, 60, START_MS - 10 * 60 * MINUTE_MS), 3600);
});

test('a null started_at is expired, not timed from the epoch', () => {
  assert.equal(remainingSeconds(null, 60, START_MS), 0);
});

test('an unparseable started_at is expired', () => {
  assert.equal(remainingSeconds('not a timestamp', 60, START_MS), 0);
});

test('a zero-minute contest is over the moment it starts', () => {
  assert.equal(remainingSeconds(START, 0, START_MS), 0);
});

test('a negative duration cannot produce a negative remainder', () => {
  assert.equal(remainingSeconds(START, -30, START_MS), 0);
});

test('long past the window it stays at 0, never negative', () => {
  for (const daysLate of [1, 7, 365]) {
    assert.equal(
      remainingSeconds(START, 60, START_MS + daysLate * 24 * 60 * MINUTE_MS),
      0,
      `${daysLate} days late`,
    );
  }
});

test('it never returns a value outside [0, duration] for any of these inputs', () => {
  const durations = [0, 1, 60, 180];
  const offsetsMs = [-MINUTE_MS, 0, 1, 999, 1000, 59_000, 60_000, 10 * MINUTE_MS, 1e12];
  for (const minutes of durations) {
    for (const offset of offsetsMs) {
      const value = remainingSeconds(START, minutes, START_MS + offset);
      assert.ok(
        value >= 0 && value <= minutes * 60,
        `duration=${minutes}min offset=${offset}ms produced ${value}`,
      );
      assert.ok(Number.isInteger(value), `duration=${minutes}min offset=${offset}ms is not whole`);
    }
  }
});
