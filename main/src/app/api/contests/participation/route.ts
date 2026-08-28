import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/requestAuth';

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabase, userId } = auth;

    const { data, error } = await supabase
      .from('contest_participants')
      .select('contest_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: 'Failed to load participation' }, { status: 500 });

    return NextResponse.json({ contest_id: data?.contest_id ?? null });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


