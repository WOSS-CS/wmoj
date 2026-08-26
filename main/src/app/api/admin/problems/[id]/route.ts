import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
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
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  // Graded data lives in `problem_tests`, metadata in `problems`. These two
  // objects are written to different tables and must never be merged.
  const testUpdates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.content !== undefined) updates.content = body.content;
  if (body.points !== undefined) {
    if (typeof body.points !== 'number' || !Number.isInteger(body.points) || body.points < 1) {
      return NextResponse.json({ error: 'Points must be a positive integer' }, { status: 400 });
    }
    updates.points = body.points;
  }
  if (body.time_limit !== undefined) {
    if (typeof body.time_limit !== 'number' || isNaN(body.time_limit) || body.time_limit <= 0) {
      return NextResponse.json({ error: 'Time limit must be a positive number' }, { status: 400 });
    }
    updates.time_limit = body.time_limit;
  }
  if (body.memory_limit !== undefined) {
    if (typeof body.memory_limit !== 'number' || isNaN(body.memory_limit) || body.memory_limit <= 0) {
      return NextResponse.json({ error: 'Memory limit must be a positive number' }, { status: 400 });
    }
    updates.memory_limit = body.memory_limit;
  }
  if (body.input !== undefined && body.output !== undefined) {
    if (!Array.isArray(body.input) || !Array.isArray(body.output)) {
      return NextResponse.json({ error: 'Input and output must be arrays' }, { status: 400 });
    }
    if (body.input.length === 0 || body.output.length === 0) {
      return NextResponse.json({ error: 'Input and output arrays must not be empty' }, { status: 400 });
    }
    if (body.input.length !== body.output.length) {
      return NextResponse.json({ error: 'Input and output arrays must have equal length' }, { status: 400 });
    }
    testUpdates.input = body.input;
    testUpdates.output = body.output;
  }
  if (body.generator_file !== undefined) {
    if (body.input === undefined || body.output === undefined) {
      return NextResponse.json({ error: 'generator_file can only be updated together with input/output' }, { status: 400 });
    }
    if (body.generator_file !== null && typeof body.generator_file !== 'string') {
      return NextResponse.json({ error: 'generator_file must be a string' }, { status: 400 });
    }
    testUpdates.generator_file = body.generator_file;
  }
  // Unlike generator_file, the checker is independent of the stored test data,
  // so it can be updated on its own. Blank clears it back to NULL, which
  // restores exact output comparison.
  if (body.checker !== undefined) {
    if (body.checker !== null && typeof body.checker !== 'string') {
      return NextResponse.json({ error: 'checker must be a string' }, { status: 400 });
    }
    testUpdates.checker = typeof body.checker === 'string' && body.checker.trim().length > 0 ? body.checker : null;
  }
  const touchesTestData = Object.keys(testUpdates).length > 0;
  if (Object.keys(updates).length === 0 && !touchesTestData) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  // A test-data-only edit — a checker change, say — still has to run the UPDATE
  // on `problems` below: that statement carries the scoping that turns a target
  // this caller may not touch into a 404, and it is what stamps `updated_at`.
  // Give it a column to write when nothing else in the request changed.
  if (Object.keys(updates).length === 0) {
    updates.updated_at = new Date().toISOString();
  }
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
    // An UPDATE of exactly the columns this request changed. It cannot be rebuilt
    // from the `problems` row the way it used to be — that row no longer carries
    // the graded columns — and naming only what changed is also what keeps a
    // checker-only edit from blanking the tests it never mentioned.
    const { data: testRow, error: testsErr } = await supabase
      .from('problem_tests')
      .update(testUpdates)
      .eq('problem_id', id)
      .select('problem_id')
      .maybeSingle();
    if (testsErr) {
      console.error('Update problem_tests error:', testsErr);
      return NextResponse.json({ error: 'Failed to update problem test data' }, { status: 500 });
    }
    // RLS filters rather than raises, so a row this caller cannot write — or a
    // problem with no side-table row at all — comes back as zero rows updated
    // and `error === null`. Without this the editor would show a green save for
    // an edit that never landed.
    if (!testRow) {
      console.error(`Update problem_tests matched no row for problem "${id}"`);
      return NextResponse.json({ error: 'Failed to update problem test data' }, { status: 500 });
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
