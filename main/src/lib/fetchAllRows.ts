/**
 * The completeness adapter for an unbounded PostgREST read.
 *
 * Lived inside `app/contests/[id]/leaderboard/page.tsx`, which is not where a
 * general PostgREST rule belongs: `app/contests/page.tsx` had the same exposure
 * and no way to reach the fix.
 */

/**
 * Rows per request in {@link fetchAllRows}. The loop never assumes the server
 * honoured the full page, so this is a round-trip and memory tuning knob and
 * nothing more — correctness does not depend on its value.
 */
export const FETCH_PAGE_SIZE = 1000;

/**
 * Hard bound on {@link fetchAllRows}. At the page size above this is 50,000
 * rows, far past anything a page here can legitimately need, so reaching it
 * means something is wrong — a pathological data set, or a query whose ordering
 * stopped being total and is walking in circles. Hitting it is reported as a
 * failure, never as a completed fetch: an aggregate that is silently wrong is
 * worse than one that visibly did not load.
 */
export const MAX_FETCH_PAGES = 50;

/** The subset of a PostgREST response {@link fetchAllRows} needs. */
export interface PageResponse<T> {
  data: T[] | null;
  error: { message: string } | null;
  count: number | null;
}

/**
 * Fetch every row a query matches, not merely the first page of them.
 *
 * PostgREST silently caps an unbounded result set: past the cap it answers
 * 206 Partial Content, and `postgrest-js` treats 206 as success. An
 * unbounded `.select()` therefore hands back a truncated array with
 * `error: null`, and every aggregate computed from it — a rank, a score, a
 * participant list, a count — is confidently wrong with nothing to show for it.
 *
 * So page explicitly, and make completeness provable rather than assumed:
 *
 *   - `fetchPage` must ask for `{ count: 'exact' }`, which reports the size
 *     of the whole matching set regardless of any cap. The loop stops when
 *     it has that many rows, so a server-side cap *below* `FETCH_PAGE_SIZE`
 *     costs extra round trips instead of silently ending the walk early.
 *   - The offset advances by rows actually received, never by
 *     `page * FETCH_PAGE_SIZE`, for the same reason.
 *   - `fetchPage` must impose a *total* order (a unique column or a unique
 *     combination). LIMIT/OFFSET over an unordered relation may repeat or
 *     skip rows between pages, which would reintroduce the same bug from a
 *     different direction.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResponse<T>>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let total: number | null = null;

  for (let page = 0; page < MAX_FETCH_PAGES; page++) {
    const from = rows.length;
    const { data, error, count } = await fetchPage(from, from + FETCH_PAGE_SIZE - 1);

    if (error) return { rows: [], error: error.message };
    if (page === 0) total = count;

    const batch = data || [];
    for (const row of batch) rows.push(row);

    // An empty page always terminates: there is nothing left to walk.
    if (batch.length === 0) break;
    if (total !== null && rows.length >= total) break;
    // Only reachable if `{ count: 'exact' }` was omitted or the server
    // withheld the count. Falling back to "a short page is the last page"
    // is the weaker rule, but it is strictly better than looping forever.
    if (total === null && batch.length < FETCH_PAGE_SIZE) break;
  }

  if (total !== null && rows.length < total) {
    return { rows: [], error: `stopped after ${MAX_FETCH_PAGES} pages with ${rows.length}/${total} rows` };
  }
  return { rows, error: null };
}
