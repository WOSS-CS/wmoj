import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;

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
      return NextResponse.json({ error: 'Failed to verify contest' }, { status: 500 });
    }
    if (!contest || !contest.is_active) {
      return NextResponse.json({ error: 'Contest is not active' }, { status: 403 });
    }

    // Check if user is already in any contest
    const { data: existing, error: existErr } = await supabase
      .from('contest_participants')
      .select('contest_id')
      .eq('user_id', userId)
      .limit(1);

    if (existErr) {
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
      return NextResponse.json({ error: 'Failed to join contest' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


