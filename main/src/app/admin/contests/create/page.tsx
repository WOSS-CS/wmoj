import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import CreateContestClient from './CreateContestClient';

export default async function CreateContestPage() {
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

  return <CreateContestClient />;
}
