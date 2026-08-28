import type { TestResult } from './judge';

/**
 * The one wire shape of `GET /api/{user,admin,manager}/submissions/[id]`.
 *
 * It was hand-declared twice and the two declarations disagreed:
 * `hooks/useViewCode.ts` typed `results` as `unknown[] | null` (which is why
 * five modal bodies opened by casting `selected.results || []` to `TestResult[]`),
 * while `app/submissions/SubmissionsClient.tsx` typed it `TestResult[] | null`
 * and omitted `user_id` and `status` entirely. All three routes now build this
 * shape through `lib/submissionDetail.ts` and every consumer reads it.
 *
 * Type-only and import-free apart from `TestResult`, so client components can
 * import it without dragging server code across the boundary.
 */
export interface SubmissionDetail {
  id: string;
  problem_id: string;
  problem_name: string;
  user_id: string;
  language: string;
  code: string;
  /**
   * The FULL per-case array from `submission_private.results_full` — not the
   * five-key redacted copy on the public `submissions.results` column. The
   * untyped JSON is cast exactly once, in `readSubmissionDetail`.
   */
  results: TestResult[];
  summary: { total: number; passed: number; failed: number };
  /** The compiler's message, from `submission_private.compile_error`. */
  compileError: string | null;
  /** `submissions.status` is GENERATED STORED and nullable. Never written. */
  status: string | null;
  /** `submissions.created_at` is nullable in the schema. */
  created_at: string | null;
}
