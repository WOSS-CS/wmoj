import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from('contests')
    .select('id,name,length,is_active,updated_at,created_at')
    .eq('created_by', user.id);
  if (error) {
    console.error('List contests error:', error);
    return NextResponse.json({ error: 'Failed to fetch contests' }, { status: 500 });
  }
  return NextResponse.json({ contests: data || [] });
}
