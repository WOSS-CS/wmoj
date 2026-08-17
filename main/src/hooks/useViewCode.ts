'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/Toast';

/** The full submission data returned by the GET /api/{admin,manager}/submissions/[id] endpoint. */
export interface ViewCodeSubmission {
  id: string;
  problem_id: string;
  problem_name: string;
  user_id: string;
  language: string;
  code: string;
  results: unknown[] | null;
  summary: { total: number; passed: number; failed: number };
  compileError: string | null;
  status: string;
  created_at: string;
}

interface UseViewCodeOptions {
  /** Build the GET URL for a submission id, e.g. (id) => `/api/manager/submissions/${id}` */
  buildUrl: (id: string) => string;
  /** Returns the Bearer token, or undefined to send no auth header. */
  getToken: () => string | undefined;
}

interface UseViewCodeResult {
  /** The fetched full submission (with code/results). Null until loaded. */
  selected: ViewCodeSubmission | null;
  /** True while the GET is in flight. The modal should show a spinner. */
  loading: boolean;
  /** Open the modal for a submission id — triggers the fetch. */
  open: (id: string) => void;
  /** Close the modal and clear state. */
  close: () => void;
}

/**
 * Shared "View Code" modal hook for admin/manager submission-list routes.
 *
 * On `open(id)`:
 *   - sets `loading=true`, `selected=null` (modal opens immediately with spinner)
 *   - fetches `GET /api/{role}/submissions/[id]` with Bearer auth
 *   - on success: sets `selected` (modal populates with code/results)
 *   - on failure: `toast.error` + closes (selected=null, loading=false)
 *
 * Request cancellation: a ref counter tracks the latest `open` call. If the user
 * clicks row A then row B before A resolves, only B's result is applied (A's
 * stale response is discarded). This prevents the stale-data race.
 *
 * The modal JSX stays in each route (presentation varies), but reads from
 * `{ selected, loading, open, close }`.
 *
 * Render the modal when `loading || selected` is truthy (so the spinner shows
 * immediately on click). On error, both become false → modal unmounts.
 */
export function useViewCode({ buildUrl, getToken }: UseViewCodeOptions): UseViewCodeResult {
  const [selected, setSelected] = useState<ViewCodeSubmission | null>(null);
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
        setSelected(data.submission as ViewCodeSubmission);
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