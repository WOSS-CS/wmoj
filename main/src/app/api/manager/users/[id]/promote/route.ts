import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase } = auth;

    const body = await request.json().catch(() => null);
    if (typeof body?.promote !== 'boolean') {
      return NextResponse.json({ error: 'promote boolean required' }, { status: 400 });
    }
    const { promote } = body;

    if (promote) {
      // Not an upsert: `admins_update_own` covers only the caller's own row, and
      // UPDATE on `admins` is column-scoped to (last_login, updated_at), so an
      // ON CONFLICT DO UPDATE path raises 42501 and surfaces as a masked 500
      // instead of "already an admin".
      const { data: existing, error: existingErr } = await supabase
        .from('admins')
        .select('id')
        .eq('id', targetUserId)
        .maybeSingle();
      if (existingErr) {
        console.error('Admin lookup error:', existingErr);
        return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
      }
      if (existing) {
        return NextResponse.json({ error: 'User is already an admin' }, { status: 409 });
      }

      // `created_at` is left to its `now()` default — sending it would rewrite
      // the only record of when the role was first granted on a re-promotion.
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('admins')
        .insert({ id: targetUserId, is_active: true, updated_at: now, last_login: now });
      if (error) {
        console.error('Promote error:', error);
        return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
      }
    } else {
      const { data: deleted, error } = await supabase
        .from('admins')
        .delete()
        .eq('id', targetUserId)
        .select('id');
      if (error) {
        console.error('Demote error:', error);
        return NextResponse.json({ error: 'Failed to demote user' }, { status: 500 });
      }
      if (!deleted || deleted.length === 0) {
        return NextResponse.json({ error: 'User is not an admin' }, { status: 404 });
      }
    }

    return NextResponse.json({ ok: true, isAdmin: promote });
  } catch (e) {
    console.error('Manager promote route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
