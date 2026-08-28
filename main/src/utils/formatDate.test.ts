import assert from 'node:assert/strict';
import test from 'node:test';

import { formatSubmittedAt } from '@/utils/formatDate';

test('formatSubmittedAt writes "Mon D, YYYY, HH:MM AM" in the viewer\'s zone', () => {
  // Shape only: the wall-clock digits depend on the machine\'s time zone.
  assert.match(formatSubmittedAt('2026-08-28T12:59:26.000Z'), /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2} [AP]M$/);
});

test('formatSubmittedAt renders a missing timestamp as an em dash, never "Invalid Date"', () => {
  assert.equal(formatSubmittedAt(null), '—');
  assert.equal(formatSubmittedAt(undefined), '—');
  assert.equal(formatSubmittedAt(''), '—');
});
