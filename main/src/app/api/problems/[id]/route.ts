import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Problem ID is required' },
        { status: 400 }
      );
    }

    // Build supabase client; prefer bearer if provided for participation checks
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearer = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : null;
    const supabase = bearer ? getServerSupabaseFromToken(bearer) : await getServerSupabase();

    const { data: problem, error } = await supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching problem:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Problem not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch problem' },
        { status: 500 }
      );
    }

    // If problem belongs to a contest, enforce participant-only access
    if (problem.contest) {
      // Anonymous or no token → forbid
      if (!bearer) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { data: authUser, error: userErr } = await supabase.auth.getUser();
      const userId = authUser?.user?.id;
      if (userErr || !userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { data: participant, error: partErr } = await supabase
        .from('contest_participants')
        .select('user_id')
        .eq('user_id', userId)
        .eq('contest_id', problem.contest)
        .maybeSingle();
      if (partErr || !participant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ problem });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
