import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { validateSlug } from '@/utils/validation';

// The graded data (input/output/checker/generator_file) lives ONLY in
// `public.problem_tests`, which is staff-only. The four legacy columns were dropped
// from `problems` — that table is world-readable, so the answer key sat in it for
// anyone who asked. There is no second copy and no fallback: if the write below
// fails, the problem has no test data at all, which is why it is undone rather than
// left half-applied.

export async function POST(request: NextRequest) {
  try {
    const { id, name, content, input, output, timeLimit, memoryLimit, points, generator_file, checker } = await request.json();

    const slugError = validateSlug(id, 'Problem');
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    if (generator_file !== undefined && generator_file !== null && typeof generator_file !== 'string') {
      return NextResponse.json({ error: 'generator_file must be a string' }, { status: 400 });
    }

    if (checker !== undefined && checker !== null && typeof checker !== 'string') {
      return NextResponse.json({ error: 'checker must be a string' }, { status: 400 });
    }

    // A blank checker is stored as NULL so "no checker" has exactly one
    // representation — the submit route omits the field from the judge
    // payload on NULL/empty, falling back to exact output comparison.
    const checkerSource = typeof checker === 'string' && checker.trim().length > 0 ? checker : null;

    if (!name || !content || !input || !output) {
      return NextResponse.json(
        { error: 'Name, content, input, and output are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(input) || !Array.isArray(output)) {
      return NextResponse.json(
        { error: 'Input and output must be arrays' },
        { status: 400 }
      );
    }

    if (input.length !== output.length) {
      return NextResponse.json(
        { error: 'Input and output arrays must have the same length' },
        { status: 400 }
      );
    }

    if (input.length === 0) {
      return NextResponse.json(
        { error: 'At least one test case is required' },
        { status: 400 }
      );
    }

    if (timeLimit !== undefined && (typeof timeLimit !== 'number' || isNaN(timeLimit) || timeLimit <= 0)) {
      return NextResponse.json(
        { error: 'Time limit must be a positive number' },
        { status: 400 }
      );
    }

    if (memoryLimit !== undefined && (typeof memoryLimit !== 'number' || isNaN(memoryLimit) || memoryLimit <= 0)) {
      return NextResponse.json(
        { error: 'Memory limit must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof points !== 'number' || !Number.isInteger(points) || points < 1) {
      return NextResponse.json(
        { error: 'Points must be a positive integer' },
        { status: 400 }
      );
    }

    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase, user } = auth;

    // Check uniqueness of problem ID
    const { data: existing } = await supabase.from('problems').select('id').eq('id', id).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'A problem with this ID already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('problems')
      .insert([
        {
          id,
          name,
          content,
          time_limit: timeLimit || 5000,
          memory_limit: memoryLimit || 256,
          points: points,
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
    const { error: testsErr } = await supabase
      .from('problem_tests')
      .insert([
        {
          problem_id: id,
          input,
          output,
          checker: checkerSource,
          generator_file: generator_file ?? null,
        }
      ]);

    if (testsErr) {
      console.error('problem_tests insert error:', testsErr);
      await supabase.from('problems').delete().eq('id', id);
      return NextResponse.json(
        { error: 'Failed to store problem test data' },
        { status: 500 }
      );
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
