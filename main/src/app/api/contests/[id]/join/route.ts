import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    const body = await request.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;

    console.log('Join contest request:', { id, userId, body });

    if (!id || !userId) {
      return NextResponse.json({ error: 'contest id and userId are required' }, { status: 400 });
    }

    // Ensure contest is active
    const { data: contest, error: contestErr } = await supabase
      .from('contests')
      .select('id,is_active')
      .eq('id', id)
      .maybeSingle();

    if (contestErr) {
      console.log('Contest verification error:', contestErr);
      return NextResponse.json({ error: 'Failed to verify contest' }, { status: 500 });
    }
    if (!contest || !contest.is_active) {
      console.log('Contest not found or inactive:', { contest, is_active: contest?.is_active });
      return NextResponse.json({ error: 'Contest is not active' }, { status: 403 });
    }

    // Check if user is already in any contest
    const { data: existing, error: existErr } = await supabase
      .from('contest_participants')
      .select('contest_id')
      .eq('user_id', userId)
      .limit(1);

    if (existErr) {
      console.log('Participation check error:', existErr);
      return NextResponse.json({ error: 'Failed to check participation' }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      // Already in a contest
      if (existing[0].contest_id === id) {
        return NextResponse.json({ ok: true, message: 'Already joined' });
      }
      return NextResponse.json({ error: 'User already joined another contest' }, { status: 409 });
    }

    // Insert participation
    const { error: insertErr } = await supabase
      .from('contest_participants')
      .insert({ contest_id: id, user_id: userId });

    if (insertErr) {
      console.log('Insert participation error:', insertErr);
      return NextResponse.json({ error: 'Failed to join contest' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log('Join contest error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


