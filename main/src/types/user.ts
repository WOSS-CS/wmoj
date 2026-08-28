import type { Row } from '@/types/supabase';

export type UserRole = 'regular' | 'admin' | 'manager';

/**
 * The signed-in user's own `public.users` row, as `AuthContext` holds it.
 *
 * Derived from the generated schema rather than restated. The hand-written copy
 * this replaces declared `created_at`, `updated_at` and `last_login` non-null
 * and `profile_data` a plain object — all four are nullable — and omitted
 * `points` entirely; the `as UserProfile` cast at both call sites is what kept
 * that disagreement invisible. Only `username` is read anywhere.
 */
export type UserProfile = Row<'users'>;

/**
 * Every role currently lands on the same page. Kept as a function so a role-based
 * split can be reintroduced here without touching the call sites that already
 * await it (`AuthContext`, `AuthGuard`).
 */
export const getUserDashboardPath = (): string => {
  return '/';
};
