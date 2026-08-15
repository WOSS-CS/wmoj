import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { validateSlug } from '@/utils/validation';

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

    // Try header bearer token first (explicit), fall back to cookie-based session.
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : null;

    const supabase = bearerToken
      ? getServerSupabaseFromToken(bearerToken)
      : await getServerSupabase();

    // Fetch current user (session context via cookies). If no user, reject.
    const {
      data: { user: authUser },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin membership explicitly to provide clearer feedback before hitting RLS.
    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('id', authUser.id)
      .maybeSingle();

    if (adminErr) {
      console.error('Admin lookup error:', adminErr);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }
    if (!adminRow || adminRow.is_active === false) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

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
          created_by: authUser.id,
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
