import {
  SUBMISSION_PRIVATE_COLUMNS,
  SUBMISSION_PUBLIC_COLUMNS,
  summarizeSubmission,
} from '@/lib/queries/submissions';
import type { TestResult } from '@/types/judge';
import type { SubmissionDetail } from '@/types/submission';
import type { AppSupabaseClient } from '@/types/supabase';
import { isUuid } from '@/utils/validation';

/**
 * The one read behind `GET /api/{user,admin,manager}/submissions/[id]`.
 *
 * The three routes were 121, 105 and 143 lines whose GET halves differed only
 * by the auth call, one word of a comment, the owner's `.eq('user_id', …)`, and
 * two fields the user route happened to leave out of its response. They are now
 * auth + this function + `NextResponse.json`.
 *
 * Two rules this function exists to keep in one place:
 *
 * 1. **It runs under the CALLER'S OWN token, never the service role.** The
 *    private half is guarded by `submission_private_select_own_or_staff`, which
 *    grants access via `public.is_admin()` / `public.is_manager()` — both of
 *    which pin `is_active = true`. So a deactivated staff member is refused by
 *    the database rather than by a route, and passing a service-role client here
 *    would silently switch that boundary off.
 * 2. **A row the caller may not see is a 404, never a 403** — the repo's rule
 *    for every hidden resource. RLS filters rather than raising, so "no row"
 *    covers both "does not exist" and "not yours", and the answer is the same
 *    either way.
 */

/**
 * Who is asking. `{ ownerId }` additionally scopes the PUBLIC row to that user —
 * `public.submissions` is world-readable, so RLS alone would hand back anyone's
 * row and only the private half would be withheld.
 */
export type SubmissionScope = { ownerId: string } | 'staff';

export type SubmissionDetailResult =
  | { ok: true; detail: SubmissionDetail }
  | { ok: false; status: 404 | 500; error: string };

const NOT_FOUND: SubmissionDetailResult = { ok: false, status: 404, error: 'Submission not found' };
const FAILED: SubmissionDetailResult = { ok: false, status: 500, error: 'Failed to fetch submission' };

/**
 * The full per-case array, cast ONCE.
 *
 * `submission_private.results_full` is `jsonb`, so its shape is a runtime fact.
 * Anything that is not an array (a null, or a row written by something that was
 * not this app) becomes an empty array rather than a crash in the renderer:
 * `SubmissionDetailModal` hides the whole "Test Case Results" section when the
 * array is empty, which is exactly right for a compile error.
 */
function toTestResults(resultsFull: unknown): TestResult[] {
  if (!Array.isArray(resultsFull)) return [];
  return resultsFull as unknown as TestResult[];
}

export async function readSubmissionDetail(
  supabase: AppSupabaseClient,
  id: string,
  scope: SubmissionScope,
): Promise<SubmissionDetailResult> {
  // `submissions.id` is a uuid. Asking Postgres about a value that cannot be one
  // raises 22P02, which the error branch below would report as a 500 — but a
  // caller who names a non-id has simply named nothing.
  if (!isUuid(id)) return NOT_FOUND;

  let publicQuery = supabase
    .from('submissions')
    .select(SUBMISSION_PUBLIC_COLUMNS)
    .eq('id', id);
  if (scope !== 'staff') publicQuery = publicQuery.eq('user_id', scope.ownerId);

  const { data: submission, error: subErr } = await publicQuery.maybeSingle();

  if (subErr) {
    console.error('Error fetching submission:', subErr);
    return FAILED;
  }
  // Either no such submission, or (for an owner scope) somebody else's.
  if (!submission) return NOT_FOUND;

  const { data: priv, error: privErr } = await supabase
    .from('submission_private')
    .select(SUBMISSION_PRIVATE_COLUMNS)
    .eq('submission_id', id)
    .maybeSingle();

  if (privErr) {
    console.error('Error fetching submission_private:', privErr);
    return FAILED;
  }
  if (!priv) {
    // The public row is visible and the policy above already decided the caller
    // may read the private half, so this is not a permissions miss — it is an
    // orphan. `record_submission` writes both halves in one transaction, so a
    // row can only lose its private half to a hand edit or a manual delete.
    // Log it as the defect it is; answer 404, because there is no submission
    // detail to show.
    console.error(
      `Submission ${id} has a public row but no submission_private row. ` +
        `The private write failed and was not compensated — investigate.`,
    );
    return NOT_FOUND;
  }

  // `submissions.problem_id` has no FK to `problems`, so resolve the display
  // name with a separate lookup rather than an embedded join. A failure here is
  // logged but not fatal: the name is a label, and the code and the per-case
  // results are still worth showing under 'Unknown Problem'.
  const { data: problem, error: problemErr } = await supabase
    .from('problems')
    .select('name')
    .eq('id', submission.problem_id)
    .maybeSingle();

  if (problemErr) {
    console.error(`Error resolving problem name for submission ${id}:`, problemErr);
  }

  const summary = summarizeSubmission(submission.summary);

  return {
    ok: true,
    detail: {
      id: submission.id,
      problem_id: submission.problem_id,
      problem_name: problem?.name || 'Unknown Problem',
      user_id: submission.user_id,
      language: submission.language,
      // From `submission_private`, not the public row: the caller has been
      // authorised for exactly this data by the policy on that table. The
      // column is nullable and the renderer wants a string.
      code: priv.code ?? '',
      results: toTestResults(priv.results_full),
      summary: { total: summary.total, passed: summary.passed, failed: summary.failed },
      compileError: priv.compile_error ?? null,
      status: submission.status,
      created_at: submission.created_at,
    },
  };
}
