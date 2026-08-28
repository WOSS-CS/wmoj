import type { PublicTestResult, SubmissionSummary, TestResult } from '@/types/judge';
import type { Json } from '@/types/supabase';

/**
 * The redaction that keeps the answer key off the world-readable
 * `public.submissions` table.
 *
 * `submissions`' SELECT policy is `using (true)` to {anon, authenticated}, and
 * RLS filters rows, not columns — so anything written to `results` or `summary`
 * here is published to every visitor holding the publishable key. The private
 * half (source code, the full per-case array, compiler diagnostics) goes to
 * `public.submission_private` instead.
 *
 * The SQL side of this lives in
 * `supabase/migrations/20260827203000_split_submission_private_data.sql`, which
 * applied exactly the same allowlist to the 3,457 already-stored elements. The
 * two must stay in step: if you add a key here, add it there.
 */

/**
 * ALLOWLIST — deliberately, and this is load-bearing.
 *
 * Every element stored before this change carried exactly nine keys, so a
 * denylist of the four private ones would have looked equivalent. It is not.
 * The current judge also emits `timeMs`, `cpuMs`, `memKb`, `truncated` and
 * `checkerMessage`, and `checkerMessage` is checker stderr that routinely
 * quotes the expected output ("expected '42', found '17'"). A denylist would
 * republish the answer key publicly on the very next submission, and would do
 * it again for every field the judge grows in future.
 *
 * An allowlist fails closed. A new judge field is invisible to the public
 * column until someone deliberately adds it here.
 */
export const PUBLIC_RESULT_KEYS = [
  'verdict',
  'passed',
  'index',
  'timedOut',
  'exitCode',
] as const satisfies readonly (keyof PublicTestResult)[];

/**
 * Narrow the judge's per-case array to the publishable subset.
 *
 * ORDER and ELEMENT COUNT are preserved, because `index` is only meaningful
 * relative to the array it sits in and the UI renders "Test 3 of 12" from the
 * length. A case that is not an object is replaced by an empty object rather
 * than dropped, for the same reason.
 */
export function redactTestResults(results: unknown): Partial<PublicTestResult>[] {
  if (!Array.isArray(results)) return [];
  return results.map((element) => {
    const out: Record<string, unknown> = {};
    if (element && typeof element === 'object') {
      const source = element as Record<string, unknown>;
      for (const key of PUBLIC_RESULT_KEYS) {
        if (key in source) out[key] = source[key];
      }
    }
    return out as Partial<PublicTestResult>;
  });
}

/**
 * The summary half of the same allowlist. `compileError` is the only key the
 * judge sends that must not be published, but listing what MAY appear rather
 * than what may not keeps this consistent with {@link PUBLIC_RESULT_KEYS} and
 * fails closed the same way if the summary ever grows a field.
 */
export const PUBLIC_SUMMARY_KEYS = [
  'total',
  'passed',
  'failed',
  'verdict',
] as const satisfies readonly (keyof SubmissionSummary)[];

/**
 * Reduce the summary that goes onto the public row to its publishable keys.
 *
 * `compileError` is what this drops: compiler diagnostics quote the offending
 * source lines, so publishing them publishes the student's code by another
 * route. The `verdict: 'CE'` marker STAYS public, and is load-bearing — the
 * five staff list pages read it to badge a submission CE, since the message
 * itself is no longer on the row.
 */
export function redactSummary(
  summary: Record<string, Json> | null | undefined,
): Record<string, Json> | null {
  if (!summary || typeof summary !== 'object') return null;
  const out: Record<string, Json> = {};
  for (const key of PUBLIC_SUMMARY_KEYS) {
    if (key in summary) out[key] = summary[key];
  }
  return out;
}

/** Re-exported so a caller needs one import to describe both halves of the split. */
export type { PublicTestResult, TestResult };
