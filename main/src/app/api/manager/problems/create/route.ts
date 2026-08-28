import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { validateProblemCreate } from '@/lib/problemValidation';
import { insertProblemTests } from '@/lib/problemTests';
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

export async function POST(request: NextRequest) {
  try {
    // Authenticate FIRST, before the body is parsed or validated. `validateProblemCreate`
    // answers with ten different 400s; running it first handed an unauthenticated caller
    // the entire request schema, one probe at a time. The PATCH twin already authenticated
    // first — this is the two orderings being made one.
    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase, user } = auth;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const validated = validateProblemCreate(body);
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }
    const { problem, tests } = validated;

    // Check uniqueness of problem ID
    const { data: existing } = await supabase.from('problems').select('id').eq('id', problem.id).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'A problem with this ID already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('problems')
      .insert([
        {
          ...problem,
          // `createsPending` pins the column false; without it the column is left
          // unnamed and the table default decides.
          ...(POLICY.createsPending ? { is_active: false } : {}),
          created_by: user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create problem' },
        { status: 500 }
      );
    }

    // Write the graded data to its own staff-only table. This is the ONLY copy,
    // so a failure here leaves a problem that exists but can never be graded —
    // undo the `problems` insert rather than publish that.
    const testsError = await insertProblemTests(supabase, problem.id, tests);
    if (testsError) {
      return NextResponse.json({ error: testsError.error }, { status: testsError.status });
    }

    return NextResponse.json(
      {
        success: true,
        problem: data,
        message: 'Problem created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create problem error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
