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

      // The question is not "how many managers are there" but "would this
      // demotion leave none". Counting everyone *except* the target answers it
      // directly, and no longer refuses the demotion of a stale inactive row
      // just because one active manager remains.
      const { count, error: countErr } = await supabase
        .from('managers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .neq('id', targetUserId);
      if (countErr) {
        console.error('Manager count check error:', countErr);
        return NextResponse.json({ error: 'Failed to verify manager count' }, { status: 500 });
      }
      if ((count ?? 0) < 1) {
        return NextResponse.json({ error: 'Cannot demote the last active manager' }, { status: 409 });
      }

      const { data: deleted, error } = await supabase
        .from('managers')
        .delete()
        .eq('id', targetUserId)
        .select('id');
      if (error) {
        console.error('Demote-manager error:', error);
        return NextResponse.json({ error: 'Failed to demote user' }, { status: 500 });
      }
      if (!deleted || deleted.length === 0) {
        return NextResponse.json({ error: 'User is not a manager' }, { status: 404 });
      }
    } else {
      // Not an upsert: `managers_update_own` covers only the caller's own row,
      // and UPDATE on `managers` is column-scoped to (last_login, updated_at),
      // so an ON CONFLICT DO UPDATE path raises 42501 and surfaces as a masked
      // 500 instead of "already a manager".
      const { data: existing, error: existingErr } = await supabase
        .from('managers')
        .select('id')
        .eq('id', targetUserId)
        .maybeSingle();
      if (existingErr) {
        console.error('Manager lookup error:', existingErr);
        return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
      }
      if (existing) {
        return NextResponse.json({ error: 'User is already a manager' }, { status: 409 });
      }

      // `created_at` is left to its `now()` default — sending it would rewrite
      // the only record of when the role was first granted on a re-promotion.
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('managers')
        .insert({ id: targetUserId, is_active: true, updated_at: now, last_login: now });
      if (error) {
        console.error('Promote-manager error:', error);
        return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
      }

      // Manager supersedes admin, and the UI renders a single role. Leaving a
      // stale `admins` row behind hides the "Demote from Admin" control while
      // the user is still an admin.
      const { error: adminErr } = await supabase
        .from('admins')
        .delete()
        .eq('id', targetUserId);
      if (adminErr) {
        console.error('Promote-manager admin cleanup error:', adminErr);
        return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
      }
    }

    const { data: adminRow } = await supabase
      .from('admins')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();

    return NextResponse.json({ ok: true, isManager: promote, isAdmin: !!adminRow });
  } catch (e) {
    console.error('Manager promote-manager route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
