---
name: list-pages
description: Build and change paginated list and table pages on WMOJ — the server recipe (parsePage, .range with an exact count, computeTotalPages, clampPage plus redirect), the optimistic client hooks, instant filters versus debounced search, per-page enrichment, the shared View Code modal, and the matching loading.tsx skeleton. Use whenever someone wants to add, edit, paginate, filter, search, sort, or speed up a list, table, dashboard, or admin/manager management page, or fix a broken paginator, a stale table after a delete, or a slow list query.
---

# Paginated list pages on WMOJ

Every DB-backed list on WMOJ paginates on the **server**: the `page.tsx` fetches exactly one page of
rows, and the client renders them with an optimistic paginator and shimmer skeletons. Fifteen routes
already do this. Copy one instead of inventing a variant — `app/admin/problems/manage/` is the
cleanest complete example (server page, client, `loading.tsx`), and `app/admin/dashboard/` is the
reference for a submission list.

Two rules govern everything below:

1. **The server is the source of truth.** The client never mutates its own row array. Every change
   to the data — a delete, a toggle, a filter, a page flip — goes back through the server.
2. **A page fetches one page's worth of data and nothing more.** That includes enrichment lookups
   and heavy columns. The whole point of this subsystem is that a 20-row page costs 20 rows.

## Where the shared infra lives

| Module | What it gives you |
|---|---|
| `lib/pagination.ts` | `parsePage`, `computeRange`, `computeTotalPages`, `clampPage`, `buildPageHref` — pure, safe on both sides |
| `hooks/usePaginatedNavigation.ts` | optimistic `displayPage`, `isLoading`, `handlePageChange`, `handleFilterChange`, `buildHref`, `startTransition` |
| `hooks/useDebouncedSearch.ts` | 300 ms debounced URL writes for text inputs |
| `hooks/useViewCode.ts` | on-demand `{code, results}` fetch + modal state for submission lists |
| `components/Pagination.tsx` | the paginator (**default** export) |
| `components/DataTable.tsx` | the table, with `loading` / `skeletonRowCount` skeleton rows |
| `components/TableBodySkeleton.tsx` | named export; skeleton `<tr>`s for hand-rolled tables |
| `components/SkeletonLoader.tsx` | `Skeleton`, `SkeletonTable`, `SkeletonCard` for `loading.tsx` |

## The pipeline

`PAGE_SIZE` is **20** in every route. Declare it as a module-level `const` in the `page.tsx`.

**1. Parse the page.** `searchParams` is a `Promise` in Next 16 — `await` it, then
`parsePage(sp.page)`. `parsePage` returns 1 for missing, non-numeric, NaN, and `< 1` values, and
deliberately does **not** clamp to `totalPages`; step 4 does that.

**2. Query one page with an exact count.**

```ts
const { from, to } = computeRange(currentPage, PAGE_SIZE);
const { data, count } = await supabase
  .from('problems')
  .select('id, name, is_active, points, created_at, updated_at', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(from, to);
```

`computeRange` returns inclusive bounds, matching Supabase's `.range()` semantics. `{ count:
'exact' }` is what makes `totalPages` possible — without it there is no paginator.

**3. Compute the page count.** `computeTotalPages(count, PAGE_SIZE)` always returns at least 1, so
an empty table renders a one-page paginator rather than a zero-page one.

**4. Clamp and redirect out-of-range pages.**

```ts
const effectivePage = clampPage(currentPage, totalPages);
if (effectivePage !== currentPage) redirect(buildPageHref({ search, filter }, effectivePage));
```

This runs **after** the count and **before** enrichment — enriching rows for a page you are about to
redirect away from is wasted work. It is also what makes "user deletes the last row on page 7"
correct: the next render finds 6 pages and redirects to 6.

**5. Enrich per page, never per table.** Collect the ids that appear in *this page's* rows and batch
one lookup per relation:

```ts
const userIds = [...new Set(pageRows.map(s => s.user_id).filter(Boolean))];
const { data: users } = await supabase.from('users').select('id, username, email').in('id', userIds);
```

Build a `Map` and read it while shaping the rows. There are no FKs on `submissions.user_id` or
`problem_id`, so PostgREST embedding is not available and a missing row is normal — always fall back
(`'Unknown User'`, `'Unknown Problem'`).

**6. Pass rows, `currentPage`, `totalPages`, and the current filter values** to the client.
Everything the client needs to rebuild a URL comes from props; see step 9.

**7. Wire the client hook.** In the `*Client.tsx`:

```tsx
const currentParams = {
  search: currentSearch || undefined,
  filter: currentFilter !== 'all' ? currentFilter : undefined,
};
const { displayPage, isLoading, handlePageChange, handleFilterChange, startTransition, buildHref } =
  usePaginatedNavigation({ currentPage, totalPages, currentParams });
```

Never put `page` in `currentParams` — the hook owns it. `useOptimistic` moves `displayPage` to the
clicked page immediately and auto-reverts when the new server `currentPage` arrives;
`useTransition` drives `isLoading` until the new tree commits.

**8. Render the paginator and the table.**

```tsx
<Pagination currentPage={currentPage} totalPages={totalPages} buildHref={buildHref}
            displayPage={displayPage} loading={isLoading} onPageChange={handlePageChange} />
<DataTable columns={columns} rows={rows} rowKey={r => r.id} loading={isLoading} skeletonRowCount={20} />
```

`Pagination` is a **default** export from `@/components/Pagination` (not `components/ui/`). Passing
`buildHref` is not optional even with `onPageChange`: the `<Link href>` is what gives middle-click,
copy-link, and no-JS navigation. For a hand-rolled `<table>` instead of `DataTable`, use
`<TableBodySkeleton columns={n} rows={20} columnWidths={[…]} />` inside the existing `<tbody>` — it
returns bare `<tr>`s so the caller's `divide-y divide-border` still applies.

**9. Filters are instant; text search is debounced.** A filter button, a status pill, or a sort
select calls `handleFilterChange({ filter: f !== 'all' ? f : undefined })` — it merges into
`currentParams`, resets the page to 1, `router.replace`s, and shows the same skeleton. A text input
uses `useDebouncedSearch` (300 ms):

```tsx
const { value, onChange } = useDebouncedSearch({
  param: 'search', initialValue: currentSearch,
  preserveParams: { filter: currentFilter !== 'all' ? currentFilter : undefined },
  startTransition,  // from usePaginatedNavigation — without it the skeleton never appears
});
```

The input updates on every keystroke and only the URL write is debounced. Pass `startTransition`
through or the search navigation runs outside the transition and the table just freezes.

**10. After a mutation, refresh — do not patch state.**

```ts
await fetch(`/api/admin/problems/${p.id}`, { method: 'DELETE', headers: … });
startTransition(() => router.refresh());
```

`router.refresh()` re-runs the server component for the current page, which re-counts, re-clamps and
re-redirects. `setRows(prev => prev.filter(...))` cannot do any of that: the count goes stale, the
paginator lies, and deleting the last row of a page leaves an empty table with no way back.

## Submission lists never select `code`

Five routes list submissions — `/admin/dashboard`, `/manager/dashboard`,
`/admin|manager/problems/[id]/submissions`, and `/manager/usermanagement/[id]`. Every one selects
exactly:

```
id, created_at, language, status, summary, problem_id[, user_id]
```

`code` and `results` are the two large columns in the table; pulling them for 20 rows to show three
of them is the bug server pagination was introduced to fix. The "View Code" modal fetches them on
demand from `GET /api/{admin,manager}/submissions/[id]`, through **`useViewCode`**:

```tsx
const { selected, loading, open, close } = useViewCode({
  buildUrl: id => `/api/admin/submissions/${id}`,
  getToken: () => session?.access_token,
});
```

The hook already handles the request-id race (click row A, then row B before A resolves — only B is
applied), the toast on failure, and the open-with-spinner-then-populate sequence. Render the modal
when `loading || selected` is truthy. Only the modal JSX belongs to the route.

## The `loading.tsx` skeleton

Every list route has one, and it must **mirror the real page**: same heading block, same filter row,
same table shape, same column count. Build it from `@/components/SkeletonLoader`
(`Skeleton`, `SkeletonTable`, `SkeletonCard`), wrap it in
`<div role="status" aria-busy="true" aria-label="Loading">`, and close with
`<span className="sr-only">Loading…</span>`. A skeleton whose shape differs from the page it precedes
reads as a layout jump, which is worse than no skeleton at all.

This file covers the *route* transition. The in-table skeleton for a page flip is the `loading` prop
on `DataTable` / `TableBodySkeleton` from step 8 — both exist, and both are needed.

## Traps

| Trap | Reality |
|---|---|
| `<DataTable headerVariant="green">` | `getTableTheme()` **ignores its argument entirely** and returns one shared theme. The prop is dead API-compatibility surface; do not style through it. |
| `DataTable`'s sortable columns | Sort only the **20 rows of the current page**, not the table. For a real sort, add an `?sort=` param and `.order()` on the server. |
| `page=1` in a URL | `buildPageHref` omits it by default. Don't hand-build hrefs that add it back. |
| `useSearchParams` | Zero usages, on purpose — it forces a `<Suspense>` boundary in Next 16. Filter state comes from server props. |
| An admin list page | Has a manager twin. Both trees must change together. |

## Never

- Never re-introduce client-side pagination for a DB-backed list. `ClientPagination` was deleted and
  `DataTable`'s `pageSize` prop was removed; there are zero references left to either. A small,
  static, non-DB list may be an exception — make it deliberately, not by habit.
- Never call `setRows(prev => …)` after a delete or a toggle. Refresh through the server.
- Never select `code` or `results` in a submission-list query.
- Never hand-roll the View Code fetch/state/modal triplet — reuse `useViewCode`.
- Never fetch enrichment data for anything but the current page's ids.
- Never omit `{ count: 'exact' }`, or the paginator has nothing to count with.
- Never include `page` in `currentParams` or in `preserveParams`; both hooks manage it.
- Never ship a new list route without a `loading.tsx` that mirrors it.

---

**Keeping this current:** if you find anything here outdated, stale, wrong, or missing — a changed
hook signature, a new shared component, a route that had to deviate and why — update it as part of
your change. This skill is only useful while it is accurate.
