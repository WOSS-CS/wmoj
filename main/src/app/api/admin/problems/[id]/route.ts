import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
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
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;
  // Admins only ever act on their own problems (the RLS write policies require
  // created_by = auth.uid()), so scope the read the same way: a problem they can
  // never edit must not open in the editor. Hidden resources 404, never 403.
  const { data, error } = await supabase
    .from('problems')
    .select('id,name,content,is_active,time_limit,memory_limit,points,created_at,updated_at,contest_problems(contest_id)')
    .eq('id', id)
    .eq('created_by', user.id)
    .maybeSingle();
  if (error) {
    console.error('Fetch admin problem error:', error);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: tests, error: testsErr } = await supabase
    .from('problem_tests')
    .select('input,checker,generator_file')
    .eq('problem_id', id)
    .maybeSingle();
  if (testsErr) {
    console.error('Fetch admin problem tests error:', testsErr);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }

  // Return test case count instead of full arrays to keep payload small
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
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;
  // `allowIsActive: false` — only managers flip `is_active`, so the field is
  // ignored here. That delta from the manager twin is deliberate (AGENTS.md).
  const built = buildProblemUpdate(await request.json(), { allowIsActive: false });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: built.status });
  const { updates, testUpdates, touchesTestData } = built;
  // `.eq('created_by', user.id)` is load-bearing, not belt-and-braces: RLS FILTERS
  // rather than raising, so without it an unowned target updates zero rows with
  // error === null and this route would answer 200 with a green success banner.
  const { data, error } = await supabase
    .from('problems')
    .update(updates)
    .eq('id', id)
    .eq('created_by', user.id)
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
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  // Fetch content before deletion so we can clean up associated images
  const { data: problem } = await supabase
    .from('problems')
    .select('content')
    .eq('id', id)
    .eq('created_by', user.id)
    .maybeSingle();

  // `problem_tests` cascades on the problem row.
  const { data: deleted, error } = await supabase
    .from('problems')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Delete problem error:', error);
    return NextResponse.json({ error: 'Failed to delete problem' }, { status: 500 });
  }
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Image cleanup is gated on an ACTUAL deletion, never on the content fetch:
  // `problems` is world-readable, so `content` comes back for rows this admin
  // cannot delete, and the storage removal is irreversible.
  if (problem?.content) {
    await deleteProblemImages(supabase, problem.content);
  }

  return NextResponse.json({ success: true });
}
