import { redirect } from 'next/navigation';
import { requireActiveAdmin } from '@/lib/staffAuth';
import { PROBLEM_EDIT_COLUMNS } from '@/lib/queries/problems';
import { PROBLEM_TEST_EDIT_COLUMNS } from '@/lib/queries/problemTests';
import EditProblemClient from './EditProblemClient';

export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await requireActiveAdmin();

  // Scoped to this admin's own rows: the RLS write policies require
  // created_by = auth.uid(), so opening the editor on someone else's problem
  // could only ever produce a save that silently writes nothing.
  const { data: problemData, error: problemError } = await supabase
    .from('problems')
    .select(PROBLEM_EDIT_COLUMNS)
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle();

  if (problemError || !problemData) {
    redirect('/admin/problems/manage');
  }

  // Graded data lives in the staff-only `problem_tests` side table (C4). RLS
  // authorises staff to read it through the normal client.
  const { data: testsData } = await supabase
    .from('problem_tests')
    .select(PROBLEM_TEST_EDIT_COLUMNS)
    .eq('problem_id', id)
    .maybeSingle();

  // Only send test case count to the client, not the full arrays
  const testCaseCount = Array.isArray(testsData?.input) ? testsData.input.length : 0;

  return (
    <EditProblemClient
      problem={{
        ...problemData,
        generator_file: testsData?.generator_file ?? null,
        checker: testsData?.checker ?? null,
        test_case_count: testCaseCount,
      }}
    />
  );
}
