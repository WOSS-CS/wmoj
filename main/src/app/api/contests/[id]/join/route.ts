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
      console.log('Join contest missing bearer token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accessToken = authHeader.split(' ')[1];
    const supabase = getServerSupabaseFromToken(accessToken);
    const body = await request.json().catch(() => ({}));
    const requestedUserId: string | undefined = body?.userId;

    // Verify authenticated user via the token
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      console.log('Join contest auth error:', authErr);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    console.log('Join contest request:', { id, userId, body, requestedUserId });

    if (!id || !userId) {
      return NextResponse.json({ error: 'contest id and userId are required' }, { status: 400 });
    }

    // Ensure contest is active and get contest details
    const { data: contest, error: contestErr } = await supabase
      .from('contests')
      .select('id,is_active,length')
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

    // Parallelize multiple checks for better performance
    const [historyResult, existingResult] = await Promise.all([
      supabase
        .from('join_history')
        .select('id')
        .eq('user_id', userId)
        .eq('contest_id', id)
        .limit(1),
      supabase
        .from('contest_participants')
        .select('contest_id')
        .eq('user_id', userId)
        .limit(1)
    ]);

    const { data: historyData, error: historyErr } = historyResult;
    const { data: existing, error: existErr } = existingResult;

    if (historyErr) {
      console.log('Join history check error:', historyErr);
      return NextResponse.json({ error: 'Failed to check join history' }, { status: 500 });
    }

    if (historyData && historyData.length > 0) {
      return NextResponse.json({ error: 'You have already left this contest and cannot rejoin' }, { status: 403 });
    }

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

    // Record join in history
    const { error: joinHistoryErr } = await supabase
      .from('join_history')
      .insert({
        user_id: userId,
        contest_id: id,
        joined_at: new Date().toISOString()
      });

    if (joinHistoryErr) {
      console.log('Join history insert error:', joinHistoryErr);
    }

    // Insert participation
    const { error: insertErr } = await supabase
      .from('contest_participants')
      .insert({ contest_id: id, user_id: userId });

    if (insertErr) {
      console.log('Insert participation error:', insertErr);
      return NextResponse.json({ error: 'Failed to join contest' }, { status: 500 });
    }

    // Create/update countdown timer on server
    const { error: timerErr } = await supabase
      .from('countdown_timers')
      .upsert({
        user_id: userId,
        contest_id: id,
        started_at: new Date().toISOString(),
        duration_minutes: contest.length,
        is_active: true
      });

    if (timerErr) {
      console.log('Timer creation error:', timerErr);
      // Don't fail the join if timer creation fails, but log it
    } else {
      console.log('Timer created for user', userId, 'in contest', id, 'duration:', contest.length, 'minutes');
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log('Join contest error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


