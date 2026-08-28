import type { AssertColumns, Checked } from './columns';
import type { Row } from '@/types/supabase';

/**
 * The `contests` column sets, named by PURPOSE, each beside the row type it
 * produces.
 *
 * `contests` was selected seventeen different ways across the tree, including
 * the same ten-column list spelled with and without spaces and three
 * `select('*')` that published every column the table will ever grow into an
 * RSC payload. The strings below are the only spellings left.
 *
 * Each constant and its `Pick` sit next to each other, and the `ColumnChecks`
 * tuple at the foot of the file proves at compile time that the two agree —
 * the typed client checks the STRING against the schema and `Pick` checks the
 * NAMES, but only that tuple checks them against each other.
 */

/**
 * The public contests index (`/contests`).
 *
 * Both result sets become a `ContestsClient` prop and React serialises every
 * prop into the RSC flight payload, so this is a publication boundary.
 * `created_by` is deliberately absent — nothing on that page reads it.
 */
export const CONTEST_LIST_COLUMNS =
  'id, name, description, length, is_active, created_at, updated_at, starts_at, ends_at, is_rated';

/** One row of {@link CONTEST_LIST_COLUMNS}, columns only. */
export type ContestListColumnsRow = Pick<
  Row<'contests'>,
  | 'id'
  | 'name'
  | 'description'
  | 'length'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
  | 'starts_at'
  | 'ends_at'
  | 'is_rated'
>;

/**
 * What `/contests` hands its client: the row above plus the two counts the page
 * derives from the junction tables. Kept separate from
 * {@link ContestListColumnsRow} so the column check below compares like with
 * like — neither count is a column.
 */
export type ContestListRow = ContestListColumnsRow & {
  participants_count?: number;
  problems_count?: number;
};

/**
 * One contest as its two detail pages and `GET /api/contests/[id]` render it.
 *
 * `created_by` is here because the page's own access gate (`canUserAccessContest`)
 * needs it and `/contests/[id]/view` shows the owner an edit affordance; nothing
 * else on either page reads it. `created_at`/`updated_at` are NOT here — no
 * detail surface shows them.
 */
export const CONTEST_DETAIL_COLUMNS =
  'id, name, description, length, is_active, created_by, starts_at, ends_at, is_rated';

/** One row of {@link CONTEST_DETAIL_COLUMNS}. */
export type ContestDetailRow = Pick<
  Row<'contests'>,
  | 'id'
  | 'name'
  | 'description'
  | 'length'
  | 'is_active'
  | 'created_by'
  | 'starts_at'
  | 'ends_at'
  | 'is_rated'
>;

/**
 * The least a surface needs to name a contest and place it in its window: the
 * home page's "ongoing" and "upcoming" rails. Feeds a client prop.
 */
export const CONTEST_SCHEDULE_COLUMNS = 'id, name, starts_at, ends_at, is_active';

/** One row of {@link CONTEST_SCHEDULE_COLUMNS}. */
export type ContestScheduleRow = Pick<
  Row<'contests'>,
  'id' | 'name' | 'starts_at' | 'ends_at' | 'is_active'
>;

/**
 * The staff `manage` tables (`{admin,manager}/contests/manage`).
 *
 * Same columns as {@link CONTEST_LIST_COLUMNS} minus `description`, which no
 * table cell renders. Feeds a client prop on both trees.
 */
export const CONTEST_MANAGE_COLUMNS =
  'id, name, length, is_active, updated_at, created_at, starts_at, ends_at, is_rated';

/** One row of {@link CONTEST_MANAGE_COLUMNS}. */
export type ContestManageRow = Pick<
  Row<'contests'>,
  | 'id'
  | 'name'
  | 'length'
  | 'is_active'
  | 'updated_at'
  | 'created_at'
  | 'starts_at'
  | 'ends_at'
  | 'is_rated'
>;

/**
 * The contest editor's shape — the six twin sites that load a contest for
 * editing: both `{admin,manager}/contests/[id]/edit/page.tsx` and the GET/PATCH
 * re-reads in both `api/{admin,manager}/contests/[id]/route.ts`.
 *
 * The same ten columns as {@link CONTEST_LIST_COLUMNS} today, and ALIASED to it
 * rather than respelled: the two answer different questions and may diverge, but
 * one list written out twice is exactly the defect this file exists to end —
 * the two spellings that already existed differed only in whitespace. If the
 * editor ever needs a column the public index must not publish, write the list
 * out here then, and the check at the foot of the file will keep it honest.
 */
export const CONTEST_EDIT_COLUMNS = CONTEST_LIST_COLUMNS;

/** One row of {@link CONTEST_EDIT_COLUMNS}. */
export type ContestEditRow = ContestListColumnsRow;

/**
 * What the contest gate needs to decide whether a problem is reachable.
 * Status is computed, never stored — see `getContestStatus`.
 */
export const CONTEST_GATE_COLUMNS = 'id, is_active, starts_at, ends_at';

/** One row of {@link CONTEST_GATE_COLUMNS}. */
export type ContestGateRow = Pick<
  Row<'contests'>,
  'id' | 'is_active' | 'starts_at' | 'ends_at'
>;

/**
 * What Invariant 3 (contest-problem eligibility) needs: whether the contest is
 * rated, and where "now" falls in its window.
 */
export const CONTEST_ELIGIBILITY_COLUMNS = 'id, is_active, is_rated, starts_at, ends_at';

/** One row of {@link CONTEST_ELIGIBILITY_COLUMNS}. */
export type ContestEligibilityRow = Pick<
  Row<'contests'>,
  'id' | 'is_active' | 'is_rated' | 'starts_at' | 'ends_at'
>;

/**
 * The pre-read behind a staff PATCH: `created_by` for `STAFF_POLICY.scopeToOwner`
 * and the rest for `guardActivatedContest` plus Invariant 3.
 */
export const CONTEST_WRITE_GUARD_COLUMNS = 'is_active, is_rated, created_by, starts_at, ends_at';

/** One row of {@link CONTEST_WRITE_GUARD_COLUMNS}. */
export type ContestWriteGuardRow = Pick<
  Row<'contests'>,
  'is_active' | 'is_rated' | 'created_by' | 'starts_at' | 'ends_at'
>;

/** The pre-read behind a staff DELETE: the ownership check and the live-contest guard. */
export const CONTEST_DELETE_GUARD_COLUMNS = 'is_active, created_by';

/** One row of {@link CONTEST_DELETE_GUARD_COLUMNS}. */
export type ContestDeleteGuardRow = Pick<Row<'contests'>, 'is_active' | 'created_by'>;

/**
 * Compile-time proof that each column string above names exactly the keys of
 * its row type. Adding a column to one and forgetting the other is a build
 * error here rather than a row type that quietly disagrees with the row
 * fetched. Exported only so it counts as used; nothing imports it.
 *
 * Embedded lists are absent on purpose — an embed has no `Pick` to check.
 */
export type ColumnChecks = [
  Checked<AssertColumns<typeof CONTEST_LIST_COLUMNS, ContestListColumnsRow>>,
  Checked<AssertColumns<typeof CONTEST_DETAIL_COLUMNS, ContestDetailRow>>,
  Checked<AssertColumns<typeof CONTEST_SCHEDULE_COLUMNS, ContestScheduleRow>>,
  Checked<AssertColumns<typeof CONTEST_MANAGE_COLUMNS, ContestManageRow>>,
  Checked<AssertColumns<typeof CONTEST_EDIT_COLUMNS, ContestEditRow>>,
  Checked<AssertColumns<typeof CONTEST_GATE_COLUMNS, ContestGateRow>>,
  Checked<AssertColumns<typeof CONTEST_ELIGIBILITY_COLUMNS, ContestEligibilityRow>>,
  Checked<AssertColumns<typeof CONTEST_WRITE_GUARD_COLUMNS, ContestWriteGuardRow>>,
  Checked<AssertColumns<typeof CONTEST_DELETE_GUARD_COLUMNS, ContestDeleteGuardRow>>,
];
