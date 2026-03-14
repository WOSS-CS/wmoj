import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import EditProblemClient from './EditProblemClient';

export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  // Fetch problem and contests in parallel
  const [{ data: problemData, error: problemError }, { data: contestsData }] = await Promise.all([
    supabase
      .from('problems')
      .select('id,name,content,contest,is_active,time_limit,memory_limit,difficulty,input,output,created_at,updated_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('contests')
      .select('id,name'),
  ]);

  if (problemError || !problemData) {
    redirect('/admin/problems/manage');
  }

  // Only send test case count to the client, not the full arrays
  const { input: _input, output: _output, ...rest } = problemData;
  const testCaseCount = Array.isArray(_input) ? _input.length : 0;

  const contests = contestsData || [];

  return (
    <EditProblemClient
      problem={{ ...rest, test_case_count: testCaseCount }}
      initialContests={contests}
    />
  );
}
