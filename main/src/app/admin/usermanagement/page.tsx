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

  const [usersRes, submissionsRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, email, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('submissions')
      .select('user_id')
  ]);

  const users = usersRes.data || [];
  const submissions = submissionsRes.data || [];

  const submissionCounts = submissions.reduce((acc: Record<string, number>, sub: any) => {
    if (sub.user_id) {
      acc[sub.user_id] = (acc[sub.user_id] || 0) + 1;
    }
    return acc;
  }, {});

  const usersWithCounts = users.map(user => ({
    ...user,
    submissionsCount: submissionCounts[user.id] || 0
  }));

  return <UserManagementClient initialUsers={usersWithCounts} />;
}
