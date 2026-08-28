import type { ProblemDetailRow, ProblemListRow } from '@/lib/queries/problems';

/**
 * Problem shapes for the PUBLIC surface — the `/problems` tree and everything it
 * passes into a `'use client'` component.
 *
 * ⚠️ The graded columns (`input`, `output`, `checker`, `generator_file`) are
 * deliberately ABSENT from every type in this file, and must stay absent. They
 * live in the staff-only `public.problem_tests` table and are typed by
 * `ProblemTestData` in `@/lib/supabaseAdmin`, which is `server-only` and so
 * cannot be imported from a client component at all.
 *
 * React serialises every prop of a client component into the RSC flight payload,
 * so passing a `select('*')` problem row to a client component publishes the
 * answer key in the page source of the page students submit from. Keeping those
 * fields off these types is what makes re-introducing that a type error rather
 * than a silent regression. If you find yourself wanting to add `input` here,
 * pass a server-computed scalar instead — see `countProblemTestCases`.
 *
 * Both types below are now DERIVED from the column constants in
 * `lib/queries/problems.ts` rather than restated. The prose that used to say
 * "matches the page's explicit column list exactly" was a promise nothing
 * checked; the alias makes the compiler check it.
 */

/** The columns a problem LIST may select. See `PROBLEM_LIST_COLUMNS`. */
export type ProblemListItem = ProblemListRow;

/**
 * A full problem statement as rendered by `app/problems/[id]`. See
 * `PROBLEM_DETAIL_COLUMNS`. `is_active`/`created_by` are in it because the
 * access gate needs them server-side; both are already world-readable.
 * `time_limit` is in milliseconds and `memory_limit` in MB.
 */
export type Problem = ProblemDetailRow;

/**
 * All the submit page's client needs. Everything else the page selects
 * (`is_active`, `created_by`, the limits) is used server-side for the access
 * gate and never crosses into the client.
 */
export type ProblemSubmitTarget = Pick<Problem, 'id' | 'name'>;
