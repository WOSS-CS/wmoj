import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerEditProblemClient from './ManagerEditProblemClient';

export default async function ManagerEditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: problemData, error: problemError } = await supabase
    .from('problems')
    .select('id,name,content,is_active,time_limit,memory_limit,points,input,output,generator_file,checker,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();

  if (problemError || !problemData) {
    redirect('/manager/problems/manage');
  }

  const { input: _input, output: _output, ...rest } = problemData;
  const testCaseCount = Array.isArray(_input) ? _input.length : 0;

  return (
    <ManagerEditProblemClient
      problem={{ ...rest, test_case_count: testCaseCount }}
    />
  );
}
