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

    // Record in join_history
    const { error: historyErr } = await supabase
      .from('join_history')
      .upsert({
        user_id: userId,
        contest_id: id,
        left_at: new Date().toISOString()
      });

    if (historyErr) {
      console.log('Join history error:', historyErr);
    }

    // Remove user from contest
    const { error: deleteErr } = await supabase
      .from('contest_participants')
      .delete()
      .eq('contest_id', id)
      .eq('user_id', userId);

    if (deleteErr) {
      console.log('Leave contest error:', deleteErr);
      return NextResponse.json({ error: 'Failed to leave contest' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log('Leave contest error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
