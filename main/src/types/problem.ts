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
 */

/**
 * The columns a problem LIST may select. Matches `app/problems/page.tsx`'s
 * explicit column list exactly.
 */
export interface ProblemListItem {
  id: string;
  name: string;
  points: number;
  is_active: boolean | null;
  created_at: string;
}

/**
 * A full problem statement as rendered by `app/problems/[id]`. Matches that
 * page's explicit column list exactly. `is_active`/`created_by` are here because
 * the access gate needs them server-side; both are already world-readable.
 */
export interface Problem extends ProblemListItem {
  content: string;
  time_limit: number; // Time limit in milliseconds
  memory_limit: number; // Memory limit in MB
  created_by: string | null;
}

/**
 * All the submit page's client needs. Everything else the page selects
 * (`is_active`, `created_by`, the limits) is used server-side for the access
 * gate and never crosses into the client.
 */
export type ProblemSubmitTarget = Pick<Problem, 'id' | 'name'>;

export interface Contest {
  id: string;
  name: string;
  description: string | null;
  length: number;
  created_at: string;
  updated_at: string;
}
