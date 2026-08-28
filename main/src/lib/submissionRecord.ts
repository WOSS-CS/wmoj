// Reading the judge's raw response and writing a submission are both
// server-side jobs, and this module is the only importer of the redaction. The
// `server-only` poison pill keeps it that way by turning a client import into a
// build error.
import 'server-only';

import type { JudgeSubmitResponse } from '@/lib/judge';
import { redactSummary, redactTestResults } from '@/lib/submissionRedaction';
import type { AppSupabaseClient, Json } from '@/types/supabase';

/**
 * The one path from a judge response to a stored submission.
 *
 * What this replaces: the submit route inserted the public row, called the
 * service role to write the private row, and — when that second write failed —
 * ran a hand-rolled compensating DELETE, also through the service role, because
 * `submissions` has no owner DELETE policy. Three encodings of failure
 * collapsed into one `let insertFailed` and every ordering constraint was a
 * comment. The pair now lands atomically inside `record_submission()`
 * (`supabase/migrations/20260828120906_add_record_submission.sql`), so
 * "public row exists, private row does not" is not a state the system has, and
 * the compensation code is deleted rather than moved.
 *
 * **This module is the only place allowed to import `redactTestResults` /
 * `redactSummary`.** That is what makes the redaction unbypassable in practice:
 * there is exactly one call that can put anything into the world-readable
 * `submissions.results`, and it runs the allowlist on the way.
 *
 * Two invariants live here rather than in the route:
 *
 * 1. **Rows persist only for active problems.** A staff test-submission against
 *    an unpublished problem is graded and rendered and never stored — the stat
 *    RPCs carry no `is_active` filter and depend on it.
 * 2. **Points recalculate only on a first solve**, and only when the row
 *    actually landed. The first-solve probe therefore runs BEFORE the write, or
 *    the new row would count itself and no solve would ever be the first.
 */

export type RecordOutcome =
  /** The row landed. `firstSolve` is true only when this was the user's first AC on the problem. */
  | { stored: true; submissionId: string; firstSolve: boolean }
  /** Invariant 1 — deliberate, NOT a fault. The caller must not surface it as one. */
  | { stored: false; reason: 'inactiveProblem' }
  /** The RPC raised. Reaches the student as `stored: false`; never a silent AC. */
  | { stored: false; reason: 'writeFailed' };

/**
 * The compile message when the submission never compiled, else null.
 *
 * Pure. "Compile error" means a non-empty string, and spelling that rule twice
 * is how the route and the writer drift apart about what an empty string means.
 */
export function compileErrorOf(judge: Pick<JudgeSubmitResponse, 'compileError'>): string | null {
  return typeof judge.compileError === 'string' && judge.compileError.length > 0
    ? judge.compileError
    : null;
}

/**
 * Pure. Accepted iff the code compiled, at least one test ran, and none failed.
 *
 * A missing `failed` counts as a failure and a missing `total` as no tests:
 * an unreadable summary must never award a solve.
 */
export function isAcceptedSummary(
  summary: { total?: number; failed?: number } | null | undefined,
  isCompileError: boolean,
): boolean {
  if (isCompileError || summary == null) return false;
  return (summary.failed ?? 1) === 0 && (summary.total ?? 0) > 0;
}

/**
 * Pure. The summary that goes onto the public row: the judge's own, plus a
 * `verdict: 'CE'` marker when the code never compiled.
 *
 * The compile MESSAGE is deliberately not here — it goes to the private row.
 * The bare `CE` marker is public and load-bearing: the staff list pages badge a
 * submission CE from it, since the message itself is no longer on the row.
 *
 * `null` when the judge sent no summary and there is no `CE` to record, so the
 * public column stays NULL rather than gaining a fabricated `0/0/0`.
 */
export function summaryForStorage(
  judgeSummary: JudgeSubmitResponse['summary'] | null | undefined,
  isCompileError: boolean,
): Record<string, Json> | null {
  if (isCompileError) {
    return { ...(judgeSummary ?? { total: 0, passed: 0, failed: 0 }), verdict: 'CE' };
  }
  return judgeSummary ? { ...judgeSummary } : null;
}

/**
 * Store one submission, both halves, in one transaction — and recalculate the
 * user's stats when, and only when, it was a first solve that landed.
 *
 * Runs under the STUDENT'S OWN token: `record_submission` is SECURITY DEFINER
 * and pins `user_id` to `auth.uid()`, which is the same predicate the
 * `submissions_insert_own` policy already enforces, so nothing an authenticated
 * caller could not already write becomes writable.
 */
export async function recordSubmission(args: {
  supabase: AppSupabaseClient;
  problem: { id: string; is_active: boolean | null };
  userId: string;
  language: string;
  code: string;
  /** The judge's FULL, unredacted response. The redaction happens below and only below. */
  judge: JudgeSubmitResponse;
}): Promise<RecordOutcome> {
  const { supabase, problem, userId, language, code, judge } = args;

  // Invariant 1. Not a failure: the submission was graded and the caller will
  // render it, it simply leaves no trace.
  if (!problem.is_active) {
    return { stored: false, reason: 'inactiveProblem' };
  }

  const compileError = compileErrorOf(judge);
  const summary = summaryForStorage(judge.summary, compileError !== null);

  // BEFORE the write, or the row being inserted would be found as its own prior
  // pass and no solve would ever count as the first.
  let firstSolve = false;
  if (isAcceptedSummary(judge.summary, compileError !== null)) {
    const { data: priorPass, error: priorErr } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('problem_id', problem.id)
      .eq('status', 'passed')
      .limit(1);

    if (priorErr) {
      // Treated as "no prior pass", which recalculates stats that were already
      // correct — the recalculation is a full recompute, so the cost of being
      // wrong in this direction is one redundant call rather than a lost solve.
      console.error(`[submissionRecord] prior-pass probe failed for user ${userId}:`, priorErr);
    }
    firstSolve = (priorPass?.length ?? 0) === 0;
  }

  const { data: submissionId, error: recordErr } = await supabase.rpc('record_submission', {
    p_problem_id: problem.id,
    p_language: language,
    p_results: redactTestResults(judge.results),
    p_summary: redactSummary(summary),
    p_code: code,
    // The judge's array on its way to a `jsonb` column. `TestResult` is an
    // `interface`, and interfaces get no implicit index signature, so they are
    // not assignable to `Json` — the widening hop is required, not cosmetic.
    p_results_full: judge.results as unknown as Json,
    // The RPC does `nullif(p_compile_error, '')`, so an empty string stores NULL.
    p_compile_error: compileError ?? '',
  });

  if (recordErr || !submissionId) {
    console.error(
      `[submissionRecord] record_submission failed for user ${userId} on problem ${problem.id}:`,
      recordErr,
    );
    return { stored: false, reason: 'writeFailed' };
  }

  // Invariant 2. `recalc_user_stats` does both recalculations in one guarded
  // call and raises 42501 when the caller is neither the target nor a manager.
  // A failure here loses points, not the submission, so it is logged and the
  // outcome stays `stored`.
  if (firstSolve) {
    const { error: recalcErr } = await supabase.rpc('recalc_user_stats', { target: userId });
    if (recalcErr) {
      console.error(`[submissionRecord] recalc_user_stats failed for user ${userId}:`, recalcErr);
    }
  }

  return { stored: true, submissionId, firstSolve };
}
