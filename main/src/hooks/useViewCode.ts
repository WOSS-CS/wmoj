'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/Toast';
import type { SubmissionDetail } from '@/types/submission';

interface UseViewCodeOptions {
  /** Build the GET URL for a submission id, e.g. (id) => `/api/manager/submissions/${id}` */
  buildUrl: (id: string) => string;
  /** Returns the Bearer token, or undefined to send no auth header. */
  getToken: () => string | undefined;
}

interface UseViewCodeResult {
  /** The fetched full submission (with code/results). Null until loaded. */
  selected: SubmissionDetail | null;
  /** True while the GET is in flight. The modal should show a spinner. */
  loading: boolean;
  /** Open the modal for a submission id — triggers the fetch. */
  open: (id: string) => void;
  /** Close the modal and clear state. */
  close: () => void;
}

/**
 * Shared "View Code" modal hook for every submission-list surface.
 *
 * On `open(id)`:
 *   - sets `loading=true`, `selected=null` (modal opens immediately with spinner)
 *   - fetches `GET /api/{user,admin,manager}/submissions/[id]` with Bearer auth
 *   - on success: sets `selected` (modal populates with code/results)
 *   - on failure: `toast.error` + closes (selected=null, loading=false)
 *
 * Request cancellation: a ref counter tracks the latest `open` call. If the user
 * clicks row A then row B before A resolves, only B's result is applied (A's
 * stale response is discarded). This prevents the stale-data race.
 *
 * Pair it with `<SubmissionDetailModal submission={selected} loading={loading}
 * … />`, which is open exactly while `loading || selected` is truthy (so the
 * spinner shows immediately on click). On error both become false → the modal
 * unmounts.
 */
export function useViewCode({ buildUrl, getToken }: UseViewCodeOptions): UseViewCodeResult {
  const [selected, setSelected] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  const open = useCallback(
    async (id: string) => {
      const reqId = ++reqIdRef.current;
      setLoading(true);
      setSelected(null); // open modal immediately with a spinner, no stale data
      try {
        const token = getToken();
        const res = await fetch(buildUrl(id), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load code');
        // Only apply if this is still the latest request (not superseded by a newer open).
        if (reqId !== reqIdRef.current) return;
        setSelected(data.submission as SubmissionDetail);
      } catch (e: unknown) {
        if (reqId !== reqIdRef.current) return; // superseded — ignore
        toast.error('Failed to load code', e instanceof Error ? e.message : 'Please try again.');
        setSelected(null); // close modal on failure
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [buildUrl, getToken],
  );

  const close = useCallback(() => {
    reqIdRef.current++; // invalidate any in-flight fetch
    setSelected(null);
    setLoading(false);
  }, []);

  return { selected, loading, open, close };
}