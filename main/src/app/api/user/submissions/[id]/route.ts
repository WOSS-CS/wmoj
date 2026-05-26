import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

// GET /api/user/submissions/[id]
//   Returns a single submission — including its source `code` — but ONLY when it
//   belongs to the authenticated caller. This backs the user-facing "view my own
//   submission code" feature. Ownership is enforced in two places: the
//   `.eq('user_id', ...)` filter here, and the "Users can view their own
//   submissions" RLS policy at the database layer.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7).trim();
    const supabase = getServerSupabaseFromToken(token);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    // Scope to the caller's own submissions only.
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('id, problem_id, user_id, language, code, results, summary, status, created_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (subErr) {
      console.error('Error fetching submission:', subErr);
      return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
    }
    if (!submission) {
      // The submission either doesn't exist or doesn't belong to the caller.
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // submissions.problem_id has no FK to problems, so resolve the display name
    // with a separate lookup rather than an embedded join.
    const { data: problem } = await supabase
      .from('problems')
      .select('name')
      .eq('id', submission.problem_id)
      .maybeSingle();

    const summary = (submission.summary || {}) as {
      total?: number;
      passed?: number;
      failed?: number;
      verdict?: string;
      compileError?: string;
    };

    return NextResponse.json({
      submission: {
        id: submission.id,
        problem_id: submission.problem_id,
        problem_name: problem?.name || 'Unknown Problem',
        language: submission.language,
        code: submission.code,
        results: submission.results ?? [],
        summary: {
          total: Number(summary.total ?? 0),
          passed: Number(summary.passed ?? 0),
          failed: Number(summary.failed ?? 0),
        },
        compileError: summary.compileError ?? null,
        created_at: submission.created_at,
      },
    });
  } catch (e) {
    console.error('Submission fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
