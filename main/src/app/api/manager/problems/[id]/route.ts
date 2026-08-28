import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { buildProblemUpdate } from '@/lib/problemValidation';
import { updateProblemTests } from '@/lib/problemTests';
import { deleteProblemImages } from '@/utils/problemImages';
import { PROBLEM_TEST_EDIT_COLUMNS } from '@/lib/queries/problemTests';
import { PROBLEM_EDIT_WITH_CONTESTS_COLUMNS } from '@/lib/queries/problems';
import { STAFF_POLICY } from '@/lib/staffPolicy';

// The graded data (input/output/checker/generator_file) lives ONLY in
// `public.problem_tests`, which is staff-only. The four legacy columns were dropped
// from `problems` — that table is world-readable, so the answer key sat in it for
// anyone who asked. There is no second copy and no fallback: if the write below
// fails, the problem has no test data at all, which is why it is undone rather than
// left half-applied.

// Every difference between this route and its twin in the other staff tree is
// read from here — nothing else may differ.
const POLICY = STAFF_POLICY.manager;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;
  // Under `scopeToOwner` a staff member only ever acts on their own problems (the
  // RLS write policies require created_by = auth.uid()), so the read is scoped the
  // same way: a problem they can never edit must not open in the editor. Hidden
  // resources 404, never 403.
  let query = supabase
    .from('problems')
    .select(PROBLEM_EDIT_WITH_CONTESTS_COLUMNS)
    .eq('id', id);
  if (POLICY.scopeToOwner) query = query.eq('created_by', user.id);
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('Fetch manager problem error:', error);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: tests, error: testsErr } = await supabase
    .from('problem_tests')
    .select(PROBLEM_TEST_EDIT_COLUMNS)
    .eq('problem_id', id)
    .maybeSingle();
  if (testsErr) {
    console.error('Fetch manager problem tests error:', testsErr);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }

  // Return test case count instead of full arrays to keep payload small
  const { contest_problems: _contestProblems, ...rest } = data;
  const test_case_count = Array.isArray(tests?.input) ? tests.input.length : 0;
  // `problems` has no `contest` column — contest membership lives in the
  // contest_problems junction, which the embed returns as [{ contest_id }, ...].
  const contest_ids = (_contestProblems || []).map((r) => r.contest_id);
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
  const { supabase, user } = auth;
  // Only managers flip `is_active` (`mayPublish`); on the admin side the field is
  // ignored rather than rejected.
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const built = buildProblemUpdate(body, { allowIsActive: POLICY.mayPublish });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: built.status });
  const { updates, testUpdates, touchesTestData } = built;
  // The `created_by` scope is load-bearing, not belt-and-braces: RLS FILTERS rather
  // than raising, so without it an unowned target updates zero rows with
  // error === null and this route would answer 200 with a green success banner.
  let update = supabase
    .from('problems')
    .update(updates)
    .eq('id', id);
  if (POLICY.scopeToOwner) update = update.eq('created_by', user.id);
  const { data, error } = await update.select().maybeSingle();
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
  const { supabase, user } = auth;

  // Fetch content before deletion so we can clean up associated images
  let read = supabase
    .from('problems')
    .select('content')
    .eq('id', id);
  if (POLICY.scopeToOwner) read = read.eq('created_by', user.id);
  const { data: problem } = await read.maybeSingle();

  // `problem_tests` cascades on the problem row.
  let remove = supabase
    .from('problems')
    .delete()
    .eq('id', id);
  if (POLICY.scopeToOwner) remove = remove.eq('created_by', user.id);
  const { data: deleted, error } = await remove.select('id').maybeSingle();
  if (error) {
    console.error('Delete problem error:', error);
    return NextResponse.json({ error: 'Failed to delete problem' }, { status: 500 });
  }
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Image cleanup is gated on an ACTUAL deletion, never on the content fetch:
  // `problems` is world-readable, so `content` comes back for rows this caller
  // cannot delete, and the storage removal is irreversible.
  if (problem?.content) {
    await deleteProblemImages(supabase, problem.content);
  }

  return NextResponse.json({ success: true });
}
