export type UserRole = 'regular' | 'admin' | 'manager';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login: string;
  is_active: boolean;
  profile_data: Record<string, unknown>;
  about_me: string | null;
  problems_solved: number;
}

/**
 * Every role currently lands on the same page. Kept as a function so a role-based
 * split can be reintroduced here without touching the call sites that already
 * await it (`AuthContext`, `AuthGuard`).
 */
export const getUserDashboardPath = (): string => {
  return '/';
};
