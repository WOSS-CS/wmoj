'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseDebouncedSearchOptions {
  /** The param name in the URL (e.g. "search", "problem", "user"). */
  param: string;
  /** The current value from the server (the server-rendered searchParam value). */
  initialValue: string;
  /** Debounce delay in ms. Default 300. */
  delay?: number;
  /**
   * Other params to preserve when writing this one.
   * Pass the full current param set (e.g. `{ status: 'all', sort: 'points' }`)
   * so the hook can rebuild the URL without dropping siblings.
   * Values that are undefined/empty are omitted.
   *
   * IMPORTANT: do NOT include `page` here — the hook always resets page to 1
   * (filters change the result set).
   */
  preserveParams?: Record<string, string | undefined>;
  /** Use router.replace (default, no history entry) vs router.push (back button). */
  method?: 'replace' | 'push';
  /**
   * Optional startTransition from usePaginatedNavigation. When provided, the
   * debounced URL write is wrapped in the same transition so the caller's
   * `isLoading` state reflects the search navigation too. If omitted, the
   * write is a plain router.replace/push (no shared loading state).
   */
  startTransition?: (fn: () => void) => void;
}

interface UseDebouncedSearchResult {
  /** The current input value (controlled). Bind to <input value={...}>. */
  value: string;
  /** onChange handler — updates the input immediately, debounces the URL write. */
  onChange: (value: string) => void;
  /** True when a debounced write is pending (for showing an inline spinner). */
  isDebouncing: boolean;
  /** Imperatively flush the pending write now (e.g. on blur). */
  flush: () => void;
}

/**
 * Debounced URL-param search/filter hook.
 *
 * - The input value updates immediately (responsive UX).
 * - After `delay` ms of no typing, router.replace writes the new value to the URL.
 * - Every write resets page to 1 (filters change the result set).
 * - When the server re-renders with the new param, `initialValue` changes and
 *   the input syncs to it (unless the user is still typing).
 *
 * Usage:
 *   const search = useDebouncedSearch({
 *     param: 'search',
 *     initialValue: currentSearch,
 *     preserveParams: { status: currentStatus },
 *     startTransition,  // from usePaginatedNavigation — shares isLoading
 *   });
 *   <input value={search.value} onChange={e => search.onChange(e.target.value)} />
 */
export function useDebouncedSearch({
  param,
  initialValue,
  delay = 300,
  preserveParams = {},
  method = 'replace',
  startTransition,
}: UseDebouncedSearchOptions): UseDebouncedSearchResult {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the user has typed since the last URL write. If so, the
  // local `value` is authoritative and we must NOT clobber it with a stale
  // server `initialValue` arriving from a previous navigation.
  const [userTyped, setUserTyped] = useState(false);

  // Sync local value when the server-provided initialValue changes — but only
  // if the user hasn't typed since the last write. Uses the render-phase
  // "adjust state when a prop changes" pattern (per React docs) to avoid the
  // set-state-in-effect lint rule.
  const [prevInitial, setPrevInitial] = useState(initialValue);
  if (initialValue !== prevInitial) {
    setPrevInitial(initialValue);
    if (!userTyped) setValue(initialValue);
  }

  const writeUrl = useCallback(
    (val: string) => {
      const params = new URLSearchParams();
      for (const [key, v] of Object.entries(preserveParams)) {
        if (v == null || v === '') continue;
        if (key === 'page') continue; // always reset page on filter change
        params.set(key, v);
      }
      const trimmed = val.trim();
      if (trimmed) params.set(param, trimmed);
      // page is intentionally omitted (defaults to 1)
      const qs = params.toString();
      const href = qs ? `?${qs}` : '?';
      const doNavigate = () => {
        if (method === 'push') router.push(href);
        else router.replace(href);
      };
      if (startTransition) startTransition(doNavigate);
      else doNavigate();
      setUserTyped(false); // server will now catch up; allow sync
    },
    [param, preserveParams, router, method, startTransition],
  );

  const onChange = useCallback(
    (val: string) => {
      setUserTyped(true); // user is typing — don't let server sync clobber
      setValue(val);
      setIsDebouncing(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        writeUrl(val);
        setIsDebouncing(false);
      }, delay);
    },
    [delay, writeUrl],
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isDebouncing) {
      writeUrl(value);
      setIsDebouncing(false);
    }
  }, [isDebouncing, value, writeUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { value, onChange, isDebouncing, flush };
}