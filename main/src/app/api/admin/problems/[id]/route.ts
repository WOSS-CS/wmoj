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
