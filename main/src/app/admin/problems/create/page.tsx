import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import CreateProblemClient from './CreateProblemClient';

export default async function CreateProblemPage() {
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
  const { data: contestsData } = await supabase
    .from('contests')
    .select('id,name,length,is_active,updated_at,created_at');

  const contests = contestsData || [];

  return <CreateProblemClient initialContests={contests} />;
}
