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
    const { supabase, user } = auth;

    const body = await request.json().catch(() => null);
    if (typeof body?.promote !== 'boolean') {
      return NextResponse.json({ error: 'promote boolean required' }, { status: 400 });
    }
    const { promote } = body;

    if (!promote) {
      if (user.id === targetUserId) {
        return NextResponse.json({ error: 'You cannot demote yourself from manager' }, { status: 403 });
      }
      const { count, error: countErr } = await supabase
        .from('managers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      if (countErr) {
        console.error('Manager count check error:', countErr);
        return NextResponse.json({ error: 'Failed to verify manager count' }, { status: 500 });
      }
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Cannot demote the last active manager' }, { status: 409 });
      }

      const { error } = await supabase
        .from('managers')
        .delete()
        .eq('id', targetUserId);
      if (error) {
        console.error('Demote-manager error:', error);
        return NextResponse.json({ error: 'Failed to demote user' }, { status: 500 });
      }
    } else {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('managers')
        .upsert({ id: targetUserId, is_active: true, created_at: now, updated_at: now, last_login: now });
      if (error) {
        console.error('Promote-manager error:', error);
        return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, isManager: promote });
  } catch (e) {
    console.error('Manager promote-manager route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
