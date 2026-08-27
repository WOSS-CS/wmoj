import { NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accessToken = authHeader.split(' ')[1];
    const supabase = getServerSupabaseFromToken(accessToken);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    // Record in join_history. Must be an update, not an upsert: the row is
    // created on join, and the uniqueness here is (user_id, contest_id) while
    // the primary key is id, so an upsert either raises 23505 or inserts a
    // bogus history row with a wrong joined_at and is_virtual.
    // `.select()` is what makes a refusal visible: an UPDATE filtered away by
    // RLS reports no error, just zero rows. Checking only `.error` is how
    // left_at silently stayed NULL for every row in the first place.
    const { data: historyRows, error: historyErr } = await supabase
      .from('join_history')
      .update({ left_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('contest_id', id)
      .select('id');

    if (historyErr) {
      console.error('Join history error:', historyErr);
    } else if ((historyRows ?? []).length === 0) {
      console.error('[leave] join_history left_at matched no row for', { userId, contestId: id });
    }

    // Remove user from contest
    const { error: deleteErr } = await supabase
      .from('contest_participants')
      .delete()
      .eq('contest_id', id)
      .eq('user_id', userId);

    if (deleteErr) {
      console.error('Leave contest error:', deleteErr);
      return NextResponse.json({ error: 'Failed to leave contest' }, { status: 500 });
    }

    // Clean up countdown timer
    const { error: timerErr } = await supabase
      .from('countdown_timers')
      .delete()
      .eq('user_id', userId)
      .eq('contest_id', id);

    if (timerErr) {
      console.error('Countdown timer cleanup error:', timerErr);
      // Don't fail the request if timer cleanup fails
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Leave contest error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
