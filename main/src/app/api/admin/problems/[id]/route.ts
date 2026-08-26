import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { deleteProblemImages } from '@/utils/problemImages';

async function getAdminSupabase(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.substring(7).trim()
    : null;
  const supabase = bearerToken ? getServerSupabaseFromToken(bearerToken) : await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthorized', status: 401 };
  const { data: adminRow, error: adminErr } = await supabase
    .from('admins')
    .select('id, is_active')
    .eq('id', user.id)
    .maybeSingle();
  if (adminErr) return { error: 'Authorization check failed', status: 500 };
  if (!adminRow || adminRow.is_active === false) return { error: 'Forbidden', status: 403 };
  return { supabase };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('problems')
    .select('id,name,content,is_active,time_limit,memory_limit,points,input,output,generator_file,checker,created_at,updated_at,contest_problems(contest_id)')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Fetch admin problem error:', error);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Return test case count instead of full arrays to keep payload small
  const { input: _input, output: _output, contest_problems: _contestProblems, ...rest } = data;
  const test_case_count = Array.isArray(_input) ? _input.length : 0;
  // `problems` has no `contest` column — contest membership lives in the
  // contest_problems junction, which the embed returns as [{ contest_id }, ...].
  const contest_ids = (_contestProblems || []).map((r: { contest_id: string }) => r.contest_id);
  return NextResponse.json({ problem: { ...rest, test_case_count, contest_ids } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const body = await request.json();
  const updates: Record<string, unknown> = {};
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
    updates.input = body.input;
    updates.output = body.output;
  }
  if (body.generator_file !== undefined) {
    if (body.input === undefined || body.output === undefined) {
      return NextResponse.json({ error: 'generator_file can only be updated together with input/output' }, { status: 400 });
    }
    if (body.generator_file !== null && typeof body.generator_file !== 'string') {
      return NextResponse.json({ error: 'generator_file must be a string' }, { status: 400 });
    }
    updates.generator_file = body.generator_file;
  }
  // Unlike generator_file, the checker is independent of the stored test data,
  // so it can be updated on its own. Blank clears it back to NULL, which
  // restores exact output comparison.
  if (body.checker !== undefined) {
    if (body.checker !== null && typeof body.checker !== 'string') {
      return NextResponse.json({ error: 'checker must be a string' }, { status: 400 });
    }
    updates.checker = typeof body.checker === 'string' && body.checker.trim().length > 0 ? body.checker : null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
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
  return NextResponse.json({ problem: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  // Fetch content before deletion so we can clean up associated images
  const { data: problem } = await supabase
    .from('problems')
    .select('content')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('problems')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Delete problem error:', error);
    return NextResponse.json({ error: 'Failed to delete problem' }, { status: 500 });
  }

  // Best-effort image cleanup after successful deletion
  if (problem?.content) {
    await deleteProblemImages(supabase, problem.content);
  }

  return NextResponse.json({ success: true });
}
