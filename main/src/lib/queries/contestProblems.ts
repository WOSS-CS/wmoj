import type { AssertColumns, Checked } from './columns';
import type { Row } from '@/types/supabase';

/**
 * The `contest_problems` column sets.
 *
 * `problems` has NO `contest` column — this junction IS the relationship, so
 * membership is counted by joining it and "standalone" is derived by
 * anti-joining it. Most reads here want a single scalar (`problem_id` alone
 * appears at eleven sites) and those stay inline; only the shapes used at more
 * than one site are named.
 */

/** Both sides of the link, for building a problem → contests map. */
export const CONTEST_PROBLEM_LINK_COLUMNS = 'problem_id, contest_id';

/** One row of {@link CONTEST_PROBLEM_LINK_COLUMNS}. */
export type ContestProblemLinkRow = Pick<Row<'contest_problems'>, 'problem_id' | 'contest_id'>;

/**
 * The problems already attached to a contest, as the staff edit form's picker
 * lists them.
 *
 * An EMBED, so there is no `Pick` beside it: PostgREST resolves the shape and
 * the typed client infers it. The embed is a plain (left) join here because the
 * edit form must still show a problem that has since been deactivated —
 * `/contests/[id]` and `/contests/[id]/view` use `problems!inner(…)` with an
 * `is_active` filter instead, which is a different question and stays local to
 * those two pages.
 */
export const CONTEST_PROBLEM_PICKER_COLUMNS = 'problem_id, problems(id, name, points)';

/**
 * Compile-time proof that each column string above names exactly the keys of
 * its row type. Adding a column to one and forgetting the other is a build
 * error here rather than a row type that quietly disagrees with the row
 * fetched. Exported only so it counts as used; nothing imports it.
 *
 * Embedded lists are absent on purpose — an embed has no `Pick` to check.
 */
export type ColumnChecks = [
  Checked<AssertColumns<typeof CONTEST_PROBLEM_LINK_COLUMNS, ContestProblemLinkRow>>,
];
