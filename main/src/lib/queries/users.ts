import type { AssertColumns, Checked } from './columns';
import type { Row } from '@/types/supabase';

/**
 * The `users` column sets, named by PURPOSE, each beside the row type it
 * produces.
 *
 * ⚠️ THE PUBLIC/STAFF SPLIT IN THIS FILE IS A PRIVACY BOUNDARY, not a
 * performance one. `anon` had `email`, `last_login` and `profile_data` revoked
 * on `public.users`, so naming one of them in a query a signed-out visitor can
 * reach makes the whole query fail — and naming one in a query a signed-in
 * NON-staff visitor can reach publishes another user's address into the RSC
 * payload. {@link USER_PUBLIC_COLUMNS} is the list that is safe everywhere;
 * everything with `email` in it is staff-only, and its comment says so.
 */

/**
 * Safe on any surface, signed out included: the id → username projection.
 *
 * `submissions.user_id` carries no FK, so every submission list resolves names
 * with a separate `.in()` lookup rather than a join.
 */
export const USER_PUBLIC_COLUMNS = 'id, username';

/** One row of {@link USER_PUBLIC_COLUMNS}. */
export type UserPublicRow = Pick<Row<'users'>, 'id' | 'username'>;

/**
 * STAFF ONLY — carries `email`. Use it only under `requireActiveManager()` /
 * `requireActiveAdmin()`, or behind `getStaffSupabase`. On a public surface use
 * {@link USER_PUBLIC_COLUMNS}.
 */
export const USER_STAFF_COLUMNS = 'id, username, email';

/** One row of {@link USER_STAFF_COLUMNS}. STAFF ONLY. */
export type UserStaffRow = Pick<Row<'users'>, 'id' | 'username' | 'email'>;

/** STAFF ONLY — the manager user-management table. Carries `email`. */
export const USER_MANAGE_COLUMNS = 'id, username, email, created_at, updated_at';

/** One row of {@link USER_MANAGE_COLUMNS}. STAFF ONLY. */
export type UserManageRow = Pick<
  Row<'users'>,
  'id' | 'username' | 'email' | 'created_at' | 'updated_at'
>;

/** STAFF ONLY — the manager user-detail header. Carries `email`. */
export const USER_DETAIL_COLUMNS = 'id, username, email, created_at';

/** One row of {@link USER_DETAIL_COLUMNS}. STAFF ONLY. */
export type UserDetailRow = Pick<
  Row<'users'>,
  'id' | 'username' | 'email' | 'created_at'
>;

/**
 * A public profile page (`/users/[username]`). Reachable signed out, so it
 * names no revoked column.
 */
export const USER_PROFILE_COLUMNS = 'id, username, created_at, about_me, problems_solved, points';

/** One row of {@link USER_PROFILE_COLUMNS}. */
export type UserProfileRow = Pick<
  Row<'users'>,
  'id' | 'username' | 'created_at' | 'about_me' | 'problems_solved' | 'points'
>;

/** The public rankings table (`/users`). Reachable signed out. */
export const USER_RANKING_COLUMNS = 'id, username, problems_solved, points';

/** One row of {@link USER_RANKING_COLUMNS}. */
export type UserRankingRow = Pick<
  Row<'users'>,
  'id' | 'username' | 'problems_solved' | 'points'
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
  Checked<AssertColumns<typeof USER_PUBLIC_COLUMNS, UserPublicRow>>,
  Checked<AssertColumns<typeof USER_STAFF_COLUMNS, UserStaffRow>>,
  Checked<AssertColumns<typeof USER_MANAGE_COLUMNS, UserManageRow>>,
  Checked<AssertColumns<typeof USER_DETAIL_COLUMNS, UserDetailRow>>,
  Checked<AssertColumns<typeof USER_PROFILE_COLUMNS, UserProfileRow>>,
  Checked<AssertColumns<typeof USER_RANKING_COLUMNS, UserRankingRow>>,
];
