/**
 * Shared pagination helpers used by every server-paginated route.
 * Pure functions — safe to import from both server and client components.
 */

/** Result shape returned by server pages and consumed by client components. */
export interface PaginatedResult<T> {
  rows: T[];
  currentPage: number;
  totalPages: number;
  count: number;
}

/**
 * Parse a `page` searchParam value into a 1-indexed page number.
 * Returns 1 for undefined / non-numeric / NaN / values < 1.
 * Does NOT clamp to totalPages — the caller decides how to handle out-of-range
 * (the range query simply returns empty rows, and computeTotalPages gives the
 * real ceiling).
 */
export function parsePage(searchParamsValue: string | string[] | undefined): number {
  const raw = Array.isArray(searchParamsValue) ? searchParamsValue[0] : searchParamsValue;
  if (raw == null) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/**
 * The publication state a staff `manage` screen is filtered to.
 *
 * `pending` is the honest word: an admin-created problem or contest lands
 * `is_active = false` and waits for a manager. The database column is still
 * `is_active`; only the URL vocabulary is `pending`.
 */
export type StaffStatusFilter = 'all' | 'active' | 'pending';

/**
 * Read `?status=` off a `manage` screen's searchParams.
 *
 * All four staff `manage` screens (problems and contests, admin and manager)
 * call this, which is the point — the same nested ternary written out four
 * times is exactly how two of them ended up on different vocabularies.
 *
 * Two back-compat shims, both deliberate:
 *
 * - **`inactive` → `pending`.** The manager tree has carried this since someone
 *   was bitten by the two words disagreeing; anything unrecognised is `all`.
 * - **`?filter=` → `?status=`.** The admin `manage` screens read `?filter=`
 *   until this rename, so a bookmarked or emailed link still lands on the right
 *   tab. `status` wins when both are present. **Delete the `filter` branch one
 *   release after this ships** — it is the only reason this function looks at
 *   more than one param.
 */
export function parseStaffStatus(searchParams: {
  status?: string | string[] | undefined;
  filter?: string | string[] | undefined;
}): StaffStatusFilter {
  const first = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const raw = first(searchParams.status) ?? first(searchParams.filter);
  if (raw === 'active' || raw === 'pending') return raw;
  if (raw === 'inactive') return 'pending';
  return 'all';
}

/**
 * Compute the Supabase `.range(from, to)` bounds for a 1-indexed page.
 * Both from and to are inclusive (Supabase range semantics).
 */
export function computeRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

/**
 * Compute total pages from a Supabase `count` result.
 * Always returns >= 1 so the paginator never renders a 0-page state.
 */
export function computeTotalPages(count: number | null | undefined, pageSize: number): number {
  const c = count ?? 0;
  if (c <= 0) return 1;
  return Math.max(1, Math.ceil(c / pageSize));
}

/**
 * Build a query-string href for a given page, preserving existing params.
 *
 * @param params - current param values (e.g. `{ search: 'foo', status: 'all' }`).
 *                 Values that are `undefined` or empty string are omitted.
 * @param page - the target page number.
 * @param options.omitPageOne - when true (default), `page=1` is omitted from the
 *   URL for cleaner URLs on the first page.
 *
 * Returns a relative URL like `?search=foo&page=2` (or `?`-prefixed with
 * remaining params when page is omitted, or `?` alone if no params remain).
 */
export function buildPageHref(
  params: Record<string, string | undefined>,
  page: number,
  options: { omitPageOne?: boolean } = {},
): string {
  const { omitPageOne = true } = options;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    sp.set(key, value);
  }
  if (page > 1 || !omitPageOne) {
    sp.set('page', String(page));
  } else {
    sp.delete('page');
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '?';
}

/**
 * Clamp a page number to the valid [1, totalPages] range.
 * Used by client components and server pages to guard against out-of-range pages.
 */
export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 1) return 1;
  return Math.min(totalPages, Math.max(1, Math.floor(page)));
}

/**
 * The heading a staff list shows for the status it is filtered to, so the card
 * title agrees with the tab: "Pending Problems", not "All Problems" over a list
 * that only holds pending ones.
 */
export function staffStatusLabel(status: StaffStatusFilter): 'All' | 'Active' | 'Pending' {
  switch (status) {
    case 'active':
      return 'Active';
    case 'pending':
      return 'Pending';
    default:
      return 'All';
  }
}
