import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
import { validateSlug } from '@/utils/validation';

// TEMPORARY DUAL-WRITE (C4). The graded data (input/output/checker/generator_file)
// now lives in `public.problem_tests`, which is staff-only. The four legacy columns
// on `problems` still exist and the public submit path still falls back to them, so
// every staff write updates BOTH tables and they must not be allowed to diverge.
// EXPIRY: delete the `problems` half of these writes in the same change as the
// migration that drops input/output/checker/generator_file from `problems`.

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

    // Validate that input and output are arrays
    if (!Array.isArray(input) || !Array.isArray(output)) {
      return NextResponse.json(
        { error: 'Input and output must be arrays' },
        { status: 400 }
      );
    }

    // Validate that input and output arrays have the same length
    if (input.length !== output.length) {
      return NextResponse.json(
        { error: 'Input and output arrays must have the same length' },
        { status: 400 }
      );
    }

    // Validate that input and output arrays are not empty
    if (input.length === 0) {
      return NextResponse.json(
        { error: 'At least one test case is required' },
        { status: 400 }
      );
    }

    // Validate time limit and memory limit
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

    const auth = await getAdminSupabase(request);
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
          input,
          output,
          is_active: false,
          time_limit: timeLimit || 5000,
          memory_limit: memoryLimit || 256,
          points: points,
          created_by: user.id,
          generator_file: generator_file ?? null,
          checker: checkerSource
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

    // Mirror the graded data into the staff-only side table. If this fails the
    // problem would exist with no test data anywhere but the legacy columns, so
    // undo the insert rather than leave the two tables disagreeing.
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
