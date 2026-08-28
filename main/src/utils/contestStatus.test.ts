import assert from 'node:assert/strict';
import test from 'node:test';

import { getContestStatus } from '@/utils/contestStatus';

/**
 * Contest status is NEVER stored — it is computed at call time, and both
 * timestamps being null means `virtual`, not `inactive`. Both of those are
 * invariants `AGENTS.md` names, so they are pinned here.
 */

const NOW = Date.parse('2026-08-28T12:00:00.000Z');

const PAST = '2026-08-28T11:00:00.000Z';
const FURTHER_PAST = '2026-08-27T12:00:00.000Z';
const FUTURE = '2026-08-28T13:00:00.000Z';
const FURTHER_FUTURE = '2026-08-29T12:00:00.000Z';

/** Runs `body` with `Date.now` pinned to {@link NOW}, restoring it afterwards. */
function atPinnedNow(body: () => void): void {
  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    body();
  } finally {
    Date.now = realNow;
  }
}

test('is_active false is inactive whatever the timestamps say', () => {
  atPinnedNow(() => {
    assert.equal(
      getContestStatus({ is_active: false, starts_at: PAST, ends_at: FUTURE }),
      'inactive',
    );
    assert.equal(
      getContestStatus({ is_active: false, starts_at: null, ends_at: null }),
      'inactive',
    );
    assert.equal(
      getContestStatus({ is_active: false, starts_at: FUTURE, ends_at: FURTHER_FUTURE }),
      'inactive',
    );
  });
});

test('both timestamps null is virtual, not inactive', () => {
  atPinnedNow(() => {
    assert.equal(getContestStatus({ is_active: true, starts_at: null, ends_at: null }), 'virtual');
  });
});

test('a start in the future is upcoming', () => {
  atPinnedNow(() => {
    assert.equal(
      getContestStatus({ is_active: true, starts_at: FUTURE, ends_at: FURTHER_FUTURE }),
      'upcoming',
    );
  });
});

test('now inside the window is ongoing, boundaries included', () => {
  atPinnedNow(() => {
    assert.equal(
      getContestStatus({ is_active: true, starts_at: PAST, ends_at: FUTURE }),
      'ongoing',
    );
    assert.equal(
      getContestStatus({
        is_active: true,
        starts_at: new Date(NOW).toISOString(),
        ends_at: FUTURE,
      }),
      'ongoing',
    );
    assert.equal(
      getContestStatus({
        is_active: true,
        starts_at: PAST,
        ends_at: new Date(NOW).toISOString(),
      }),
      'ongoing',
    );
  });
});

test('an end in the past is virtual', () => {
  atPinnedNow(() => {
    assert.equal(
      getContestStatus({ is_active: true, starts_at: FURTHER_PAST, ends_at: PAST }),
      'virtual',
    );
  });
});

test('only starts_at set, already begun, is virtual', () => {
  atPinnedNow(() => {
    assert.equal(getContestStatus({ is_active: true, starts_at: PAST, ends_at: null }), 'virtual');
  });
});

test('only starts_at set, still in the future, is upcoming', () => {
  atPinnedNow(() => {
    assert.equal(
      getContestStatus({ is_active: true, starts_at: FUTURE, ends_at: null }),
      'upcoming',
    );
  });
});

test('only ends_at set is virtual, whichever side of it now falls', () => {
  atPinnedNow(() => {
    assert.equal(getContestStatus({ is_active: true, starts_at: null, ends_at: FUTURE }), 'virtual');
    assert.equal(getContestStatus({ is_active: true, starts_at: null, ends_at: PAST }), 'virtual');
  });
});

test('Date.now is restored after a pinned block', () => {
  atPinnedNow(() => {
    assert.equal(Date.now(), NOW);
  });
  assert.notEqual(Date.now(), NOW);
});
