import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

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
    .select('id,name,content,contest,is_active,time_limit,memory_limit,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Fetch admin problem error:', error);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ problem: data });
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
  if (body.is_active !== undefined) updates.is_active = !!body.is_active;
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
  const { error } = await supabase
    .from('problems')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Delete problem error:', error);
    return NextResponse.json({ error: 'Failed to delete problem' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
