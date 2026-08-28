import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/requestAuth';
import { expireParticipation } from '@/lib/contestTimer';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireUser(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabase, userId } = auth;

    // Cleanup lives on the mutation routes, never on a read. Sweep FIRST: if
    // this caller's own window closed on its own some time ago, the sweep is
    // what stamps `left_at` with the instant the run actually ENDED, and
    // `expireParticipation` then leaves that stamp alone. Never fail the
    // request on it — the caller's own leave below does not depend on it.
    const { error: sweepErr } = await supabase.rpc('sweep_expired_participation');
    if (sweepErr) {
      console.error('[leave] sweep_expired_participation failed:', sweepErr);
    }

    const { ok } = await expireParticipation(supabase, userId, id);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to leave contest' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Leave contest error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
