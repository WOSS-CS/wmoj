import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { canUserAccessContest } from '@/lib/contestAccess';

interface EmbeddedProblem {
  id: string;
  name: string;
  content: string | null;
  created_at: string;
}

interface ContestProblemRow {
  problem_id: string;
  problems: EmbeddedProblem | EmbeddedProblem[] | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    if (!id) return NextResponse.json({ error: 'contest id required' }, { status: 400 });

    const { data: contest, error: contestErr } = await supabase
      .from('contests')
      .select('id, is_active, created_by')
      .eq('id', id)
      .maybeSingle();
    if (contestErr) return NextResponse.json({ error: 'Failed to load contest' }, { status: 500 });
    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;
    const hasAccess = await canUserAccessContest(supabase, contest, userId);
    if (!hasAccess) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    // Fetch problems via junction table. Inner embed + is_active filter, matching
    // /contests, /contests/[id] and /contests/[id]/view — a pending problem must
    // not be listed as part of the contest.
    const { data: cpRows, error } = await supabase
      .from('contest_problems')
      .select('problem_id, problems!inner(id, name, content, created_at, is_active)')
      .eq('contest_id', id)
      .eq('problems.is_active', true);

    if (error) return NextResponse.json({ error: 'Failed to load problems' }, { status: 500 });

    const problems = ((cpRows || []) as unknown as ContestProblemRow[])
      .map((row) => (Array.isArray(row.problems) ? row.problems[0] : row.problems))
      .filter((p): p is EmbeddedProblem => !!p)
      .map((p) => ({ id: p.id, name: p.name, content: p.content, created_at: p.created_at }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json({ problems });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
