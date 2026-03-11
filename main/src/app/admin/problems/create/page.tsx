import { getServerSupabase } from '@/lib/supabaseServer';
import CreateProblemClient from './CreateProblemClient';

export default async function CreateProblemPage() {
  const supabase = await getServerSupabase();
  const { data: contestsData } = await supabase
    .from('contests')
    .select('id,name,length,is_active,updated_at,created_at');

  const contests = contestsData || [];

  return <CreateProblemClient initialContests={contests} />;
}
