import { NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { getContestStatus } from '@/utils/contestStatus';

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

    // The request body carries a `userId`, but it is never trusted or used —
    // the participant is always the bearer token's own user.
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      console.error('Join contest auth error:', authErr);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    if (!id || !userId) {
      return NextResponse.json({ error: 'contest id and userId are required' }, { status: 400 });
    }

    // Ensure contest is active and get contest details
    const { data: contest, error: contestErr } = await supabase
      .from('contests')
      .select('id, is_active, length, created_by, starts_at, ends_at, is_rated')
      .eq('id', id)
      .maybeSingle();

    if (contestErr) {
      console.error('Contest verification error:', contestErr);
      return NextResponse.json({ error: 'Failed to verify contest' }, { status: 500 });
    }
    if (!contest || !contest.is_active) {
      return NextResponse.json({ error: 'Contest is not active' }, { status: 403 });
    }

    // Compute contest status to enforce join rules
    const status = getContestStatus(contest);

    if (status === 'upcoming') {
      return NextResponse.json({ error: 'Contest has not started yet' }, { status: 403 });
    }

    // Creators cannot join their own contest. Check BOTH staff tables: the UI
    // (ContestViewClient) blocks admins and managers alike, so checking only
    // `admins` let a manager-creator join by POSTing directly.
    if (contest.created_by === userId) {
      const [{ data: adminRow }, { data: managerRow }] = await Promise.all([
        supabase.from('admins').select('id').eq('id', userId).maybeSingle(),
        supabase.from('managers').select('id').eq('id', userId).maybeSingle(),
      ]);
      if (adminRow || managerRow) {
        return NextResponse.json(
          { error: 'You cannot join a contest you created' },
          { status: 403 }
        );
      }
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
      console.error('Join history check error:', historyErr);
      return NextResponse.json({ error: 'Failed to check join history' }, { status: 500 });
    }

    // Block rejoin for ongoing contests, but allow for virtual (free re-join)
    if (historyData && historyData.length > 0 && status !== 'virtual') {
      return NextResponse.json({ error: 'You have already left this contest and cannot rejoin' }, { status: 403 });
    }

    if (existErr) {
      console.error('Participation check error:', existErr);
      return NextResponse.json({ error: 'Failed to check participation' }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      // Already in a contest
      if (existing[0].contest_id === id) {
        return NextResponse.json({ ok: true, message: 'Already joined' });
      }
      return NextResponse.json({ error: 'User already joined another contest' }, { status: 409 });
    }

    const isVirtual = status === 'virtual';

    // Record the join. Must carry an explicit onConflict: the primary key is
    // `id` while the uniqueness that matters is (user_id, contest_id), so a
    // bare upsert generates a fresh uuid, never fires ON CONFLICT (id), and
    // raises 23505 on the rejoin path this route deliberately allows. On a
    // legitimate rejoin the row is refreshed rather than duplicated: a new
    // joined_at, the current is_virtual (a virtual rerun must not be scored as
    // the earlier competitive run), and left_at cleared.
    const { error: joinHistoryErr } = await supabase
      .from('join_history')
      .upsert(
        {
          user_id: userId,
          contest_id: id,
          joined_at: new Date().toISOString(),
          left_at: null,
          is_virtual: isVirtual
        },
        { onConflict: 'user_id,contest_id' }
      );

    if (joinHistoryErr) {
      // Fatal: join_history gates rejoins and decides who is eligible for the
      // ranked leaderboard. A join it did not record is not a join.
      console.error('Join history upsert error:', joinHistoryErr);
      return NextResponse.json({ error: 'Failed to join contest' }, { status: 500 });
    }

    // Insert participation
    const { error: insertErr } = await supabase
      .from('contest_participants')
      .insert({ contest_id: id, user_id: userId });

    if (insertErr) {
      console.error('Insert participation error:', insertErr);
      return NextResponse.json({ error: 'Failed to join contest' }, { status: 500 });
    }

    // Create/refresh the countdown timer. Same PK/UNIQUE split as join_history,
    // so the same explicit onConflict is required.
    const { error: timerErr } = await supabase
      .from('countdown_timers')
      .upsert(
        {
          user_id: userId,
          contest_id: id,
          started_at: new Date().toISOString(),
          duration_minutes: contest.length,
          is_active: true
        },
        { onConflict: 'user_id,contest_id' }
      );

    if (timerErr) {
      // Fatal: checkTimerExpiry fails closed, so a participant without a timer
      // is stranded — every problem page and every submit reports "Contest time
      // has expired" with no route back through the UI. There is no transaction
      // here, so undo the participation row rather than leave them in that state.
      console.error('Timer creation error:', timerErr);
      const { error: rollbackErr } = await supabase
        .from('contest_participants')
        .delete()
        .eq('contest_id', id)
        .eq('user_id', userId);
      if (rollbackErr) {
        console.error('Failed to roll back participation after timer error:', rollbackErr);
      }
      return NextResponse.json({ error: 'Failed to start the contest timer' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Join contest error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
