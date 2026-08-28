import { redirect } from 'next/navigation';
import { requireActiveManager } from '@/lib/staffAuth';
import { PROBLEM_EDIT_COLUMNS } from '@/lib/queries/problems';
import { PROBLEM_TEST_EDIT_COLUMNS } from '@/lib/queries/problemTests';
import ManagerEditProblemClient from './ManagerEditProblemClient';

export default async function ManagerEditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireActiveManager();

  const { data: problemData, error: problemError } = await supabase
    .from('problems')
    .select(PROBLEM_EDIT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (problemError || !problemData) {
    redirect('/manager/problems/manage');
  }

  // Graded data lives in the staff-only `problem_tests` side table (C4). RLS
  // authorises staff to read it through the normal client.
  const { data: testsData } = await supabase
    .from('problem_tests')
    .select(PROBLEM_TEST_EDIT_COLUMNS)
    .eq('problem_id', id)
    .maybeSingle();

  const testCaseCount = Array.isArray(testsData?.input) ? testsData.input.length : 0;

  return (
    <ManagerEditProblemClient
      problem={{
        ...problemData,
        generator_file: testsData?.generator_file ?? null,
        checker: testsData?.checker ?? null,
        test_case_count: testCaseCount,
      }}
    />
  );
}
