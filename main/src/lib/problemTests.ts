import type { AppSupabaseClient } from '@/types/supabase';
import type { ProblemTestData, ProblemValidationError } from '@/lib/problemValidation';

/**
 * The `problem_tests` half of the four problem write handlers
 * (`api/{admin,manager}/problems/create` and `api/{admin,manager}/problems/[id]`).
 *
 * `problem_tests` holds the ONLY copy of the graded data — `input`, `output`,
 * `checker`, `generator_file` were dropped from the world-readable `problems`
 * table. There is no fallback, so a problem whose side-table row is missing or
 * stale exists, lists, and cannot be graded. Both functions below exist to make
 * that state impossible to reach silently.
 *
 * Both return `null` on success and a `{ error, status }` rejection otherwise.
 * The status is always 500: authorization already succeeded, and this is a
 * dependent write failing after it. (404 is reserved for the case where the write
 * *is* the authorization check — an RLS-filtered target the caller may not see.)
 */

/**
 * Writes the graded data for a freshly created problem, undoing the `problems`
 * insert if it fails.
 *
 * There is no transaction here and deliberately no `create_problem_with_tests`
 * RPC: on a staff-only, low-frequency path the RPC was judged not worth the
 * schema surface. The consequence is owned rather than hidden — between the
 * `problems` insert and this one there is a window in which a problem exists with
 * no test data, and the compensating delete below narrows that window without
 * closing it.
 */
export async function insertProblemTests(
  supabase: AppSupabaseClient,
  problemId: string,
  tests: ProblemTestData
): Promise<ProblemValidationError | null> {
  const { error } = await supabase
    .from('problem_tests')
    .insert([{ problem_id: problemId, ...tests }]);
  if (!error) return null;

  console.error('problem_tests insert error:', error);

  // The compensating delete. `.select('id')` makes PostgREST return the removed
  // rows so the count can be checked: RLS FILTERS rather than raising, so a
  // delete this caller may not perform comes back as zero rows with
  // `error === null`, and discarding the result reported a clean rollback for one
  // that never happened.
  //
  // This check is SIGNAL, not PREVENTION. It cannot stop the orphaned-problem
  // window described above; it only guarantees that when the compensation itself
  // fails, a human is told which problem id to delete by hand instead of the
  // orphan sitting there ungradeable and unnoticed.
  const { data: removed, error: rollbackError } = await supabase
    .from('problems')
    .delete()
    .eq('id', problemId)
    .select('id');

  if (rollbackError || !removed || removed.length === 0) {
    console.error(
      `ORPHANED PROBLEM: rolling back problem "${problemId}" after a failed problem_tests insert removed no row. ` +
        'The problem exists with no test data, will be listed, and cannot be graded. Delete it by hand.',
      rollbackError ?? '(delete matched zero rows)'
    );
    return {
      error: `Failed to store problem test data, and rolling back the problem failed. Problem "${problemId}" now exists with no test data and must be deleted manually.`,
      status: 500,
    };
  }

  return { error: 'Failed to store problem test data', status: 500 };
}

/**
 * Applies an edit to an existing `problem_tests` row — an UPDATE of exactly the
 * columns the request changed. It cannot be rebuilt from the `problems` row the
 * way it used to be: that row no longer carries the graded columns. Naming only
 * what changed is also what keeps a checker-only edit from blanking the tests it
 * never mentioned.
 */
export async function updateProblemTests(
  supabase: AppSupabaseClient,
  problemId: string,
  testUpdates: Record<string, unknown>
): Promise<ProblemValidationError | null> {
  const { data: testRow, error } = await supabase
    .from('problem_tests')
    .update(testUpdates)
    .eq('problem_id', problemId)
    .select('problem_id')
    .maybeSingle();
  if (error) {
    console.error('Update problem_tests error:', error);
    return { error: 'Failed to update problem test data', status: 500 };
  }
  // RLS filters rather than raises, so a row this caller cannot write — or a
  // problem with no side-table row at all — comes back as zero rows updated and
  // `error === null`. Without this the editor would show a green save for an edit
  // that never landed.
  if (!testRow) {
    console.error(`Update problem_tests matched no row for problem "${problemId}"`);
    return { error: 'Failed to update problem test data', status: 500 };
  }
  return null;
}
