import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/user';

/**
 * Determines user role by checking which table the user exists in
 * @param userId - The user's ID
 * @returns Promise<UserRole> - The user's role
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    // Manager is the higher tier — check first so a user in both tables
    // resolves to 'manager'.
    const { data: managerUser, error: managerError } = await supabase
      .from('managers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!managerError && managerUser) {
      return 'manager';
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!adminError && adminUser) {
      return 'admin';
    }

    const { data: regularUser, error: regularError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!regularError && regularUser) {
      return 'regular';
    }

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
  
  return '/';
}
