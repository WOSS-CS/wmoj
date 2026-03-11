import { getServerSupabase } from '@/lib/supabaseServer';
import ProblemsClient from './ProblemsClient';
import { Problem } from '@/types/problem';

export default async function ProblemsPage() {
  const supabase = await getServerSupabase();
  const { data: problems, error } = await supabase
    .from('problems')
    .select('*')
    .is('contest', null)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error mb-2">Failed to fetch problems</p>
      </div>
    );
  }

  return <ProblemsClient initialProblems={(problems as Problem[]) || []} />;
}
