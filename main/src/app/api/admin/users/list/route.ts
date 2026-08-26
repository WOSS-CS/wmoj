import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAdminSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase } = auth;

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
