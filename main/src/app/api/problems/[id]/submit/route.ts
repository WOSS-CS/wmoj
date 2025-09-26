import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 });

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7).trim();
    const supabase = getServerSupabaseFromToken(token);

    // Fetch problem and determine contest membership
    const { data: problem, error: probErr } = await supabase
      .from('problems')
      .select('id, contest, input, output')
      .eq('id', id)
      .single();
    if (probErr || !problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Authenticated user id
    const { data: authUser, error: userErr } = await supabase.auth.getUser();
    if (userErr || !authUser?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authUser.user.id;

    // If problem is part of a contest, ensure user is a participant
    if (problem.contest) {
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

    const body = await request.json();
    const { language, code } = body || {};
    if (!language || !code) {
      return NextResponse.json({ error: 'Missing language or code' }, { status: 400 });
    }

    // Call judge service
    const JUDGE_URL = process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
    const resp = await fetch(`${JUDGE_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, input: problem.input, output: problem.output }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'Judge error' }, { status: resp.status || 500 });
    }

    // Persist submission
    const { error: insErr } = await supabase.from('submissions').insert({
      problem_id: problem.id,
      user_id: userId,
      language,
      code,
      input: problem.input,
      output: problem.output,
      results: data.results,
      summary: data.summary,
    });
    if (insErr) {
      console.warn('[submit] Failed to record submission:', insErr);
    }

    return NextResponse.json({ results: data.results, summary: data.summary });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
