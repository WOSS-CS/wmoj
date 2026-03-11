import { getServerSupabase } from '@/lib/supabaseServer';
import ContestViewClient from './ContestViewClient';

export default async function ContestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  
  const { data: contestData, error } = await supabase
    .from('contests')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !contestData) {
    return <ContestViewClient error="Failed to load contest or inactive" />;
  }

  return <ContestViewClient initialContest={contestData} />;
}
