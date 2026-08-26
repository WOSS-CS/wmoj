'use client';

import { useOptimistic, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildPageHref, clampPage } from '@/lib/pagination';

interface UsePaginatedNavigationOptions {
  /** The authoritative server-rendered current page (1-indexed). */
  currentPage: number;
  totalPages: number;
  /**
   * The current URL params (search, filter, status, sort, etc.) that should be
   * preserved across page/filter navigations. Pass the server-rendered values.
   * Values that are undefined/empty are omitted by buildPageHref.
   * Do NOT include `page` here — the hook manages it.
   */
  currentParams: Record<string, string | undefined>;
}

interface UsePaginatedNavigationResult {
  /**
   * The page to display in the paginator. This is the optimistic page when a
   * navigation is in flight, otherwise the server `currentPage`.
   * Pass this to <Pagination displayPage={...}>.
   */
  displayPage: number;
  /**
   * True when a navigation is in flight. Pass to <Pagination loading={...}> and
   * <DataTable loading={...}> (or <TableBodySkeleton>).
   */
  isLoading: boolean;
  /**
   * Call this when the user clicks a page. Inside one startTransition it:
   *   1. Sets the optimistic page (immediate highlight).
   *   2. Calls router.push(buildPageHref(currentParams, page)).
   *   3. isPending becomes true until the new server tree commits.
   * Out-of-range pages are clamped to [1, totalPages].
   */
  handlePageChange: (page: number) => void;
  /**
   * Call this when a filter/search/sort changes. Inside one startTransition it:
   *   1. Resets the optimistic page to 1 (filters change the result set).
   *   2. Calls router.replace with the merged params + page=1.
   *   3. isLoading becomes true — same skeleton as a page flip.
   * Pass ONLY the changed params (they're merged with currentParams).
   */
  handleFilterChange: (newParams: Record<string, string | undefined>) => void;
  /**
   * Build a href for a page (uses currentParams + the given page).
   * Useful for <Link href={...}> that need the href for middle-click/no-JS.
   */
  buildHref: (page: number) => string;
  /**
   * Exposed startTransition so callers can wrap ad-hoc navigations (e.g. after
   * a delete) in the same transition and share the same isLoading state.
   */
  startTransition: (fn: () => void) => void;
}

/**
 * Manages optimistic paginator UI + in-table loading state for server-paginated tables.
 *
 * Behavior:
 * - On page click, `useOptimistic` immediately sets `displayPage` to the clicked page.
 * - `useTransition` wraps `router.push`; `isPending` becomes true.
 * - When the new server props arrive (`currentPage` changes), `useOptimistic`
 *   automatically reverts to the new `currentPage` (its built-in behavior).
 * - `isPending` clears when the transition completes (new tree committed).
 * - If the user clicks page 5 then quickly page 7, the optimistic state jumps
 *   to 7 and a single new navigation supersedes the prior (router.push to 7).
 *
 * No `useSearchParams` is used — the hook relies entirely on the `currentPage`
 * prop passed from the server `page.tsx`. This avoids the Next 16 <Suspense>
 * boundary requirement.
 */
export function usePaginatedNavigation({
  currentPage,
  totalPages,
  currentParams,
}: UsePaginatedNavigationOptions): UsePaginatedNavigationResult {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // useOptimistic: the first arg is the "real" state (server currentPage).
  // When currentPage changes (new server render), optimistic auto-reverts to it.
  const [optimisticPage, setOptimisticPage] = useOptimistic(
    currentPage,
    (_state, action: number) => action,
  );

  const buildHref = useCallback(
    (page: number) => buildPageHref(currentParams, page),
    [currentParams],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      // Clamp to a large upper bound; the server re-clamps via its own totalPages.
      const clamped = clampPage(page, Math.max(totalPages, 1));
      if (clamped === optimisticPage) return; // no-op if clicking the current page
      // React requires an optimistic update to happen INSIDE the transition that
      // owns the navigation; outside one it is scheduled on a revert lane that is
      // not entangled with router.push, so the highlight can snap back before the
      // new tree commits (and React warns). Same shape as useOptimisticPathname.
      startTransition(() => {
        setOptimisticPage(clamped);
        router.push(buildPageHref(currentParams, clamped));
      });
    },
    [totalPages, optimisticPage, setOptimisticPage, router, currentParams, startTransition],
  );

  const handleFilterChange = useCallback(
    (newParams: Record<string, string | undefined>) => {
      const merged = { ...currentParams, ...newParams };
      // No-op if the merged params are identical to the current params
      // (e.g. clicking an already-active filter button).
      const currentKeys = Object.keys(currentParams).sort();
      const mergedKeys = Object.keys(merged).sort();
      const same =
        currentKeys.length === mergedKeys.length &&
        currentKeys.every((k, i) => mergedKeys[i] === k && currentParams[k] === merged[mergedKeys[i]]);
      if (same && optimisticPage === 1) return;
      startTransition(() => {
        setOptimisticPage(1); // filter change resets to page 1
        // buildPageHref with page=1 omits page=1 by default (clean URL)
        router.replace(buildPageHref(merged, 1));
      });
    },
    [currentParams, optimisticPage, setOptimisticPage, router, startTransition],
  );

  return {
    displayPage: optimisticPage,
    isLoading: isPending,
    handlePageChange,
    handleFilterChange,
    buildHref,
    startTransition,
  };
}