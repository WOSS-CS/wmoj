import { NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
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

    const { data, error } = await supabase
      .from('join_history')
      .select('contest_id')
      .eq('user_id', userId);

    if (error) {
      console.error('join-history fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch join history' }, { status: 500 });
    }

    const contest_ids = (data || [])
      .map(row => row.contest_id)
      .filter((id: string | null): id is string => !!id);

    return NextResponse.json({ contest_ids });
  } catch (e) {
    console.error('join-history error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
