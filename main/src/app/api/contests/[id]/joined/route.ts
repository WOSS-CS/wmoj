import { NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ allowed: false }, { status: 401 });
    }
    const accessToken = authHeader.split(' ')[1];
    const supabase = getServerSupabaseFromToken(accessToken);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ allowed: false }, { status: 401 });
    }
    const userId = authData.user.id;

    // Check current participation
    const { data: part, error: partErr } = await supabase
      .from('contest_participants')
      .select('contest_id')
      .eq('user_id', userId)
      .eq('contest_id', id)
      .limit(1);
    if (partErr) {
      console.error('joined check (participants) err:', partErr);
    }
    if (part && part.length > 0) {
      return NextResponse.json({ allowed: true });
    }

    // Check join history (previously joined)
    const { data: hist, error: histErr } = await supabase
      .from('join_history')
      .select('contest_id')
      .eq('user_id', userId)
      .eq('contest_id', id)
      .limit(1);
    if (histErr) {
      console.error('joined check (history) err:', histErr);
    }
    if (hist && hist.length > 0) {
      return NextResponse.json({ allowed: true });
    }

    return NextResponse.json({ allowed: false }, { status: 403 });
  } catch (e) {
    console.error('joined check error:', e);
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}
