import type { AssertColumns, Checked } from './columns';
import type { Row } from '@/types/supabase';

/**
 * The `problems` column sets, named by PURPOSE, each beside the row type it
 * produces.
 *
 * ⚠️ THE GRADED COLUMNS ARE NOT HERE AND MUST NEVER BE. `input`, `output`,
 * `checker` and `generator_file` were dropped from this world-readable table
 * and live in the staff-only `public.problem_tests` — see
 * `lib/queries/problemTests.ts`, which is server-side only. Nothing in this
 * file may name them, and nothing here needs to.
 *
 * Every constant and its `Pick` sit adjacent, and the `ColumnChecks` tuple at
 * the foot of the file proves at compile time that the two agree.
 */

/**
 * The public problem list (`/problems`), and the hot rail beside it.
 *
 * Each row is serialised into the RSC flight payload for `ProblemsClient`,
 * twenty at a time plus five hot rows, so the list pays for every column
 * twenty-five times over — `content` alone is a full Markdown statement.
 * Never widen this to `*`.
 */
export const PROBLEM_LIST_COLUMNS = 'id, name, points, is_active, created_at';

/** One row of {@link PROBLEM_LIST_COLUMNS}. */
export type ProblemListRow = Pick<
  Row<'problems'>,
  'id' | 'name' | 'points' | 'is_active' | 'created_at'
>;

/** The home page's "recently added" rail. Feeds a client prop. */
export const PROBLEM_RECENT_COLUMNS = 'id, name, points, created_at';

/** One row of {@link PROBLEM_RECENT_COLUMNS}. */
export type ProblemRecentRow = Pick<Row<'problems'>, 'id' | 'name' | 'points' | 'created_at'>;

/**
 * One problem statement, as `/problems/[id]` renders it.
 *
 * `is_active`/`created_by` are here because the access gate needs them
 * server-side; both are already world-readable. The test-case count the sidebar
 * shows is a separately-fetched server-computed scalar, never the arrays.
 */
export const PROBLEM_DETAIL_COLUMNS =
  'id, name, content, points, time_limit, memory_limit, created_at, is_active, created_by';

/** One row of {@link PROBLEM_DETAIL_COLUMNS}. */
export type ProblemDetailRow = Pick<
  Row<'problems'>,
  | 'id'
  | 'name'
  | 'content'
  | 'points'
  | 'time_limit'
  | 'memory_limit'
  | 'created_at'
  | 'is_active'
  | 'created_by'
>;

/**
 * What `/problems/[id]/submit` needs. This is the page students submit FROM,
 * and selecting the answer key here once put the expected stdout for every test
 * case into its page source. Everything below is used server-side for the
 * access gate and the judge call; only `id` and `name` cross into the client.
 */
export const PROBLEM_SUBMIT_COLUMNS = 'id, name, is_active, created_by, time_limit, memory_limit';

/** One row of {@link PROBLEM_SUBMIT_COLUMNS}. */
export type ProblemSubmitRow = Pick<
  Row<'problems'>,
  'id' | 'name' | 'is_active' | 'created_by' | 'time_limit' | 'memory_limit'
>;

/**
 * The staff `manage` tables (`{admin,manager}/problems/manage`). Feeds a client
 * prop on both trees; `content` is deliberately absent.
 */
export const PROBLEM_MANAGE_COLUMNS = 'id, name, is_active, updated_at, created_at, points';

/** One row of {@link PROBLEM_MANAGE_COLUMNS}. */
export type ProblemManageRow = Pick<
  Row<'problems'>,
  'id' | 'name' | 'is_active' | 'updated_at' | 'created_at' | 'points'
>;

/**
 * What the staff problem editor loads — both `{admin,manager}/problems/[id]/edit`
 * pages. The graded half comes separately from `problem_tests`.
 */
export const PROBLEM_EDIT_COLUMNS =
  'id, name, content, is_active, time_limit, memory_limit, points, created_at, updated_at';

/** One row of {@link PROBLEM_EDIT_COLUMNS}. */
export type ProblemEditRow = Pick<
  Row<'problems'>,
  | 'id'
  | 'name'
  | 'content'
  | 'is_active'
  | 'time_limit'
  | 'memory_limit'
  | 'points'
  | 'created_at'
  | 'updated_at'
>;

/**
 * The same row plus the contests it belongs to, which is what the twin
 * `api/{admin,manager}/problems/[id]` GET answers with.
 *
 * Composed from {@link PROBLEM_EDIT_COLUMNS} rather than respelled: a `const`
 * template literal over `const` strings keeps its literal type, so PostgREST
 * still type-checks the whole thing and the two can never drift.
 * `problems` has no `contest` column — membership is the `contest_problems`
 * junction, which is why this is an embed.
 */
export const PROBLEM_EDIT_WITH_CONTESTS_COLUMNS =
  `${PROBLEM_EDIT_COLUMNS}, contest_problems(contest_id)`;

/** The problem picker on the staff contest forms, and the search route behind it. */
export const PROBLEM_PICKER_COLUMNS = 'id, name, points';

/** One row of {@link PROBLEM_PICKER_COLUMNS}. */
export type ProblemPickerRow = Pick<Row<'problems'>, 'id' | 'name' | 'points'>;

/**
 * The id → name projection, for surfaces that show a problem's name beside a
 * row that carries only its id. `submissions.problem_id` has no FK, so this is
 * always a separate `.in()` lookup and never a join.
 */
export const PROBLEM_NAME_COLUMNS = 'id, name';

/** One row of {@link PROBLEM_NAME_COLUMNS}. */
export type ProblemNameRow = Pick<Row<'problems'>, 'id' | 'name'>;

/**
 * Compile-time proof that each column string above names exactly the keys of
 * its row type. Adding a column to one and forgetting the other is a build
 * error here rather than a row type that quietly disagrees with the row
 * fetched. Exported only so it counts as used; nothing imports it.
 *
 * Embedded lists are absent on purpose — an embed has no `Pick` to check.
 */
export type ColumnChecks = [
  Checked<AssertColumns<typeof PROBLEM_LIST_COLUMNS, ProblemListRow>>,
  Checked<AssertColumns<typeof PROBLEM_RECENT_COLUMNS, ProblemRecentRow>>,
  Checked<AssertColumns<typeof PROBLEM_DETAIL_COLUMNS, ProblemDetailRow>>,
  Checked<AssertColumns<typeof PROBLEM_SUBMIT_COLUMNS, ProblemSubmitRow>>,
  Checked<AssertColumns<typeof PROBLEM_MANAGE_COLUMNS, ProblemManageRow>>,
  Checked<AssertColumns<typeof PROBLEM_EDIT_COLUMNS, ProblemEditRow>>,
  Checked<AssertColumns<typeof PROBLEM_PICKER_COLUMNS, ProblemPickerRow>>,
  Checked<AssertColumns<typeof PROBLEM_NAME_COLUMNS, ProblemNameRow>>,
];
