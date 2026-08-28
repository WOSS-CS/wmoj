import assert from 'node:assert/strict';
import test from 'node:test';

import { FETCH_PAGE_SIZE, MAX_FETCH_PAGES, fetchAllRows, type PageResponse } from '@/lib/fetchAllRows';

/**
 * `fetchPage` is a plain function stub, never a Supabase fake (plan §3.1): the
 * whole point of the seam is that this loop can be exercised without PostgREST.
 *
 * The bug it exists to prevent is silent: PostgREST answers 206 past its row
 * cap and `postgrest-js` reports that as success, so a truncated page arrives
 * with `error: null` and every aggregate built from it is confidently wrong.
 */

type Row = { id: number };

/** Records the ranges asked for, so "did it page correctly" is assertable. */
function stub(pages: PageResponse<Row>[]) {
  const calls: Array<[number, number]> = [];
  const fetchPage = (from: number, to: number) => {
    calls.push([from, to]);
    const page = pages[calls.length - 1];
    return Promise.resolve(page ?? { data: [], error: null, count: null });
  };
  return { calls, fetchPage };
}

const rows = (from: number, n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: from + i }));

test('walks every page and stops on the exact count', async () => {
  const { calls, fetchPage } = stub([
    { data: rows(0, FETCH_PAGE_SIZE), error: null, count: FETCH_PAGE_SIZE + 3 },
    { data: rows(FETCH_PAGE_SIZE, 3), error: null, count: FETCH_PAGE_SIZE + 3 },
  ]);

  const result = await fetchAllRows<Row>(fetchPage);

  assert.equal(result.error, null);
  assert.equal(result.rows.length, FETCH_PAGE_SIZE + 3);
  assert.equal(calls.length, 2);
  // The offset advances by rows RECEIVED, never by page * FETCH_PAGE_SIZE.
  assert.deepEqual(calls, [
    [0, FETCH_PAGE_SIZE - 1],
    [FETCH_PAGE_SIZE, FETCH_PAGE_SIZE * 2 - 1],
  ]);
});

test('an empty page terminates the walk', async () => {
  const { calls, fetchPage } = stub([
    { data: rows(0, FETCH_PAGE_SIZE), error: null, count: null },
    { data: [], error: null, count: null },
  ]);

  const result = await fetchAllRows<Row>(fetchPage);

  assert.equal(result.error, null);
  assert.equal(result.rows.length, FETCH_PAGE_SIZE);
  assert.equal(calls.length, 2);
});

test('a count smaller than the first page stops after one request', async () => {
  const { calls, fetchPage } = stub([{ data: rows(0, 4), error: null, count: 4 }]);

  const result = await fetchAllRows<Row>(fetchPage);

  assert.equal(result.error, null);
  assert.deepEqual(result.rows.map((r) => r.id), [0, 1, 2, 3]);
  assert.equal(calls.length, 1);
});

test('a server cap below FETCH_PAGE_SIZE costs a round trip, never a silent truncation', async () => {
  // The exact 206 case: a short page with more rows still to come.
  const { calls, fetchPage } = stub([
    { data: rows(0, 2), error: null, count: 3 },
    { data: rows(2, 1), error: null, count: 3 },
  ]);

  const result = await fetchAllRows<Row>(fetchPage);

  assert.equal(result.error, null);
  assert.deepEqual(result.rows.map((r) => r.id), [0, 1, 2]);
  assert.deepEqual(calls[1], [2, 2 + FETCH_PAGE_SIZE - 1]);
});

test('an error on a later page discards the partial rows', async () => {
  const { fetchPage } = stub([
    { data: rows(0, FETCH_PAGE_SIZE), error: null, count: FETCH_PAGE_SIZE * 2 },
    { data: null, error: { message: 'connection reset' }, count: null },
  ]);

  const result = await fetchAllRows<Row>(fetchPage);

  // Never a half-complete array with no error: that is the bug, not the fix.
  assert.deepEqual(result.rows, []);
  assert.equal(result.error, 'connection reset');
});

test('overrunning MAX_FETCH_PAGES is reported as a failure, not a completed fetch', async () => {
  let calls = 0;
  const fetchPage = (from: number) => {
    calls++;
    return Promise.resolve({ data: [{ id: from }], error: null, count: 10_000 });
  };

  const result = await fetchAllRows<Row>(fetchPage);

  assert.equal(calls, MAX_FETCH_PAGES);
  assert.deepEqual(result.rows, []);
  assert.equal(result.error, `stopped after ${MAX_FETCH_PAGES} pages with ${MAX_FETCH_PAGES}/10000 rows`);
});

test('no count and a short first page is treated as the whole set', async () => {
  const { calls, fetchPage } = stub([{ data: rows(0, 2), error: null, count: null }]);

  const result = await fetchAllRows<Row>(fetchPage);

  assert.equal(result.error, null);
  assert.equal(result.rows.length, 2);
  assert.equal(calls.length, 1);
});
