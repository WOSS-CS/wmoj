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

    // Ensure admin
    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (adminErr || !adminRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // List all regular users (exclude admins)
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, email, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (usersErr) {
      console.error('List users error:', usersErr);
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (e) {
    console.error('Admin users list error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


