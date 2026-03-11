import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import UserManagementClient from './UserManagementClient';

export default async function AdminUserManagementPage() {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!adminRow) redirect('/dashboard');
  const { data: users } = await supabase
    .from('users')
    .select('id, username, email, is_active, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  return <UserManagementClient initialUsers={users || []} />;
}
