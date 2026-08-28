import type { AssertColumns, Checked } from './columns';
import type { Row } from '@/types/supabase';

/**
 * The `problem_tests` column sets.
 *
 * ⚠️ EVERYTHING IN THIS FILE IS STAFF-ONLY AND SERVER-SIDE. `problem_tests`
 * holds the ONLY copy of the graded data — `input`, `output` (the answer key),
 * `checker` and `generator_file` were dropped from the world-readable
 * `problems` table precisely because RLS filters rows, not columns. Its single
 * SELECT policy grants managers and active admins; the submit route reads it
 * through the service-role client in `lib/supabaseAdmin.ts` on the student's
 * behalf.
 *
 * **Never import a type from this file into a client component, and never let a
 * row typed from here become a client-component prop** — React serialises every
 * prop into the RSC flight payload, so a prop IS a publication. The two staff
 * edit pages legitimately pass `generator_file` and `checker` to their form (a
 * staff-only page), and pass `input` only as a server-computed count.
 */

/**
 * What the staff problem editor needs: the two authoring sources it renders,
 * plus `input` for its case count.
 *
 * `output` — the answer key itself — is deliberately absent: nothing in the
 * editor displays it, and it is the single column with the least business being
 * anywhere near a page.
 */
export const PROBLEM_TEST_EDIT_COLUMNS = 'input, generator_file, checker';

/** One row of {@link PROBLEM_TEST_EDIT_COLUMNS}. STAFF-ONLY, SERVER-SIDE. */
export type ProblemTestEditRow = Pick<
  Row<'problem_tests'>,
  'input' | 'generator_file' | 'checker'
>;

/**
 * Compile-time proof that each column string above names exactly the keys of
 * its row type. Adding a column to one and forgetting the other is a build
 * error here rather than a row type that quietly disagrees with the row
 * fetched. Exported only so it counts as used; nothing imports it.
 *
 * Embedded lists are absent on purpose — an embed has no `Pick` to check.
 */
export type ColumnChecks = [
  Checked<AssertColumns<typeof PROBLEM_TEST_EDIT_COLUMNS, ProblemTestEditRow>>,
];
