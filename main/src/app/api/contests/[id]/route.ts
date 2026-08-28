import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { canUserAccessContest } from '@/lib/contestAccess';
import { CONTEST_DETAIL_COLUMNS } from '@/lib/queries/contests';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('contests')
      .select(CONTEST_DETAIL_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'Failed to load contest' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;
    const hasAccess = await canUserAccessContest(supabase, data, userId);
    if (!hasAccess) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    return NextResponse.json({ contest: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


