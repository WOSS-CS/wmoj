import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/user';

/**
 * Determines user role by checking which table the user exists in
 * @param userId - The user's ID
 * @returns Promise<UserRole> - The user's role
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    // Check if user exists in admin table
    const { data: adminUser, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!adminError && adminUser) {
      return 'admin';
    }

    // Check if user exists in users table (regular user)
    const { data: regularUser, error: regularError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!regularError && regularUser) {
      return 'regular';
    }

    // Default to regular if user doesn't exist in any table
    return 'regular';
  } catch (error) {
    console.error('Error determining user role:', error);
    return 'regular';
  }
}

/**
 * Gets the appropriate dashboard path based on user role
 * @param userId - The user's ID
 * @returns Promise<string> - The dashboard path
 */
export async function getUserDashboardPath(userId: string): Promise<string> {
  const role = await getUserRole(userId);
  
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'regular':
    default:
      return '/dashboard';
  }
}
