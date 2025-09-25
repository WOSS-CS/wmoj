import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/user';

/**
 * Determines user role by checking which table the user exists in
 * @param userId - The user's ID
 * @returns Promise<UserRole> - The user's role
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    console.log('getUserRole: Checking role for user:', userId);
    
    // Check if user exists in admin table
    const { data: adminUser, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    console.log('getUserRole: Admin check result:', { adminUser, adminError });

    if (!adminError && adminUser) {
      console.log('getUserRole: User is admin');
      return 'admin';
    }

    // Check if user exists in users table (regular user)
    const { data: regularUser, error: regularError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    console.log('getUserRole: Regular user check result:', { regularUser, regularError });

    if (!regularError && regularUser) {
      console.log('getUserRole: User is regular');
      return 'regular';
    }

    // Default to regular if user doesn't exist in any table
    console.log('getUserRole: Defaulting to regular');
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
  console.log('getUserDashboardPath: Getting dashboard path for user:', userId);
  const role = await getUserRole(userId);
  console.log('getUserDashboardPath: User role:', role);
  
  switch (role) {
    case 'admin':
      console.log('getUserDashboardPath: Returning admin dashboard path');
      return '/admin/dashboard';
    case 'regular':
    default:
      console.log('getUserDashboardPath: Returning regular dashboard path');
      return '/dashboard';
  }
}
