import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServerSupabase();
    if (!id) return NextResponse.json({ error: 'contest id required' }, { status: 400 });

    // Only return problems for active contests
    const { data: contest, error: contestErr } = await supabase
      .from('contests')
      .select('id,is_active')
      .eq('id', id)
      .maybeSingle();
    if (contestErr) return NextResponse.json({ error: 'Failed to load contest' }, { status: 500 });
    if (!contest || !contest.is_active) return NextResponse.json({ error: 'Contest inactive' }, { status: 403 });

    const { data, error } = await supabase
      .from('problems')
      .select('id,name,content,contest,created_at')
      .eq('contest', id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: 'Failed to load problems' }, { status: 500 });
    return NextResponse.json({ problems: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


