import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/requestAuth';
import { readTimer } from '@/lib/contestTimer';

/**
 * The caller's countdown for one contest. A PURE READ — this handler issues no
 * writes at all.
 *
 * It used to call `getTimerStatus`, which deleted the timer row, deleted the
 * participant row and stamped `join_history.left_at` when it found the window
 * closed; the countdown context calls this endpoint on every page load, so a
 * GET was the app's main cleanup path. Ending a participation now belongs to
 * `POST /leave` and to `sweep_expired_participation()`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireUser(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabase, userId } = auth;

    const reading = await readTimer(supabase, userId, id);
    if (reading.expired) {
      // Same body the destructive version returned on this path: no remaining
      // time and no contest name to label a countdown that is not running.
      return NextResponse.json({ isActive: false });
    }

    const { data: contest, error: contestErr } = await supabase
      .from('contests')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    if (contestErr) {
      // Not fatal — the countdown is authoritative and the name is only a label.
      console.error('Timer contest name lookup error:', contestErr);
    }

    return NextResponse.json({
      isActive: true,
      remainingSeconds: reading.remainingSeconds,
      contestName: contest?.name,
    });
  } catch (error) {
    console.error('Timer status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
