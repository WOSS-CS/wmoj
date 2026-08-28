import assert from 'node:assert/strict';
import test from 'node:test';

import { parseStaffStatus, staffStatusLabel } from '@/lib/pagination';

/**
 * `parseStaffStatus` is the single reader of `?status=` for all four staff
 * `manage` screens. Its two back-compat shims are the whole reason it exists,
 * so both are pinned here — including the one that is meant to be deleted a
 * release from now, so deleting it is a deliberate test edit.
 */

test('recognises the two real states and defaults everything else to all', () => {
  assert.equal(parseStaffStatus({ status: 'active' }), 'active');
  assert.equal(parseStaffStatus({ status: 'pending' }), 'pending');
  assert.equal(parseStaffStatus({}), 'all');
  assert.equal(parseStaffStatus({ status: 'all' }), 'all');
  assert.equal(parseStaffStatus({ status: 'ACTIVE' }), 'all');
  assert.equal(parseStaffStatus({ status: '' }), 'all');
  assert.equal(parseStaffStatus({ status: 'nonsense' }), 'all');
});

test('shims the legacy inactive spelling to pending', () => {
  assert.equal(parseStaffStatus({ status: 'inactive' }), 'pending');
});

test('shims the legacy ?filter= param, which the admin manage screens used to read', () => {
  assert.equal(parseStaffStatus({ filter: 'active' }), 'active');
  assert.equal(parseStaffStatus({ filter: 'inactive' }), 'pending');
  assert.equal(parseStaffStatus({ filter: 'pending' }), 'pending');
  assert.equal(parseStaffStatus({ filter: 'nonsense' }), 'all');
});

test('status wins when both params are present', () => {
  assert.equal(parseStaffStatus({ status: 'active', filter: 'inactive' }), 'active');
  assert.equal(parseStaffStatus({ status: 'pending', filter: 'active' }), 'pending');
});

test('an unrecognised status does NOT fall through to filter', () => {
  // Otherwise `?status=all&filter=active` — the URL the "all" button produces
  // when an old `?filter=` is still in the bar — would snap back to `active`.
  assert.equal(parseStaffStatus({ status: 'all', filter: 'active' }), 'all');
});

test('takes the first value of a repeated param', () => {
  assert.equal(parseStaffStatus({ status: ['pending', 'active'] }), 'pending');
  assert.equal(parseStaffStatus({ filter: ['inactive'] }), 'pending');
  assert.equal(parseStaffStatus({ status: [] }), 'all');
});

test('staffStatusLabel names the filtered status so the card heading agrees with the tab', () => {
  assert.equal(staffStatusLabel('all'), 'All');
  assert.equal(staffStatusLabel('active'), 'Active');
  assert.equal(staffStatusLabel('pending'), 'Pending');
});
