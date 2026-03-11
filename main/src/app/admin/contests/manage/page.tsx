import { getServerSupabase } from '@/lib/supabaseServer';
import ManageContestsClient from './ManageContestsClient';

export default async function ManageContestsPage() {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from('contests')
    .select('id,name,length,is_active,updated_at,created_at');

  return <ManageContestsClient initialContests={data || []} />;
}
