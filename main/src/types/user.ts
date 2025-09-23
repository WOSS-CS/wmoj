export type UserRole = 'regular' | 'admin';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login: string;
  is_active: boolean;
  profile_data: Record<string, unknown>;
}

export const getUserDashboardPath = (userRole: UserRole): string => {
  switch (userRole) {
    case 'admin':
      return '/admin';
    case 'regular':
    default:
      return '/dashboard';
  }
};
