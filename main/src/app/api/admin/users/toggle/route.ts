import { NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function POST(request: Request) {
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

    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (adminErr || !adminRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const userId: string | undefined = body?.userId;
    const is_active: boolean | undefined = body?.is_active;
    if (!userId || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'userId and is_active required' }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateErr) {
      console.error('Toggle user error:', updateErr);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin users toggle error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


