import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerUserManagementClient from './ManagerUserManagementClient';

export default async function ManagerUserManagementPage() {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: managerRow } = await supabase
    .from('managers')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!managerRow) redirect('/');

  const [usersRes, submissionsRes, adminsRes, managersRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, email, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('submissions')
      .select('user_id'),
    supabase
      .from('admins')
      .select('id'),
    supabase
      .from('managers')
      .select('id'),
  ]);

  const users = usersRes.data || [];
  const submissions = submissionsRes.data || [];
  const adminIds = new Set((adminsRes.data || []).map((a: { id: string }) => a.id));
  const managerIds = new Set((managersRes.data || []).map((m: { id: string }) => m.id));

  const submissionCounts = submissions.reduce((acc: Record<string, number>, sub: any) => {
    if (sub.user_id) {
      acc[sub.user_id] = (acc[sub.user_id] || 0) + 1;
    }
    return acc;
  }, {});

  const usersWithCounts = users.map(user => ({
    ...user,
    submissionsCount: submissionCounts[user.id] || 0,
    isAdmin: adminIds.has(user.id),
    isManager: managerIds.has(user.id),
  }));

  return <ManagerUserManagementClient initialUsers={usersWithCounts} />;
}
