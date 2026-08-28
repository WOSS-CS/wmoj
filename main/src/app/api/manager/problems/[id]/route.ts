import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { buildProblemUpdate } from '@/lib/problemValidation';
import { updateProblemTests } from '@/lib/problemTests';
import { deleteProblemImages } from '@/utils/problemImages';

// The graded data (input/output/checker/generator_file) lives ONLY in
// `public.problem_tests`, which is staff-only. The four legacy columns were dropped
// from `problems` — that table is world-readable, so the answer key sat in it for
// anyone who asked. There is no second copy and no fallback: if the write below
// fails, the problem has no test data at all, which is why it is undone rather than
// left half-applied.

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('problems')
    .select('id,name,content,is_active,time_limit,memory_limit,points,created_at,updated_at,contest_problems(contest_id)')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Fetch manager problem error:', error);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: tests, error: testsErr } = await supabase
    .from('problem_tests')
    .select('input,checker,generator_file')
    .eq('problem_id', id)
    .maybeSingle();
  if (testsErr) {
    console.error('Fetch manager problem tests error:', testsErr);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }

  const { contest_problems: _contestProblems, ...rest } = data;
  const test_case_count = Array.isArray(tests?.input) ? tests.input.length : 0;
  // `problems` has no `contest` column — contest membership lives in the
  // contest_problems junction, which the embed returns as [{ contest_id }, ...].
  const contest_ids = (_contestProblems || []).map((r: { contest_id: string }) => r.contest_id);
  return NextResponse.json({
    problem: {
      ...rest,
      checker: tests?.checker ?? null,
      generator_file: tests?.generator_file ?? null,
      test_case_count,
      contest_ids,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  // `allowIsActive: true` — only managers flip `is_active`. That delta from the
  // admin twin is deliberate (AGENTS.md).
  const built = buildProblemUpdate(await request.json(), { allowIsActive: true });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: built.status });
  const { updates, testUpdates, touchesTestData } = built;
  // No `created_by` scoping here — managers own every problem. That delta from
  // the admin twin is deliberate (AGENTS.md).
  const { data, error } = await supabase
    .from('problems')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) {
    console.error('Update problem error:', error);
    return NextResponse.json({ error: 'Failed to update problem' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (touchesTestData) {
    const testsError = await updateProblemTests(supabase, id, testUpdates);
    if (testsError) {
      return NextResponse.json({ error: testsError.error }, { status: testsError.status });
    }
  }

  return NextResponse.json({ problem: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  // Fetch content before deletion so we can clean up associated images
  const { data: problem } = await supabase
    .from('problems')
    .select('content')
    .eq('id', id)
    .maybeSingle();

  // `problem_tests` cascades on the problem row.
  const { data: deleted, error } = await supabase
    .from('problems')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Delete problem error:', error);
    return NextResponse.json({ error: 'Failed to delete problem' }, { status: 500 });
  }
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Image cleanup is gated on an ACTUAL deletion, never on the content fetch:
  // `problems` is world-readable, so `content` comes back even when nothing was
  // deleted, and the storage removal is irreversible.
  if (problem?.content) {
    await deleteProblemImages(supabase, problem.content);
  }

  return NextResponse.json({ success: true });
}
