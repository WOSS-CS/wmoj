import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

// GET /api/user/submissions/[id]
//   Returns a single submission — including its source `code` and the FULL
//   per-case judge output — but ONLY when it belongs to the authenticated
//   caller. This backs the user-facing "view my own submission code" feature.
//
//   Ownership is enforced in two places, and neither is on `submissions`:
//     * the `.eq('user_id', …)` filter below, and
//     * the `submission_private_select_own_or_staff` RLS policy, which is
//       evaluated against the CALLER'S OWN token — this route deliberately does
//       not use the service role, so the database is the real boundary.
//
//   The public `submissions` row is world-readable by design and its `results`
//   are redacted to five keys; `code`, `results_full` and `compile_error` live
//   in `public.submission_private`. The old "Users can view their own
//   submissions" policy was dropped as strictly subsumed by the permissive
//   `using (true)` SELECT policy — it never enforced anything.
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

    // Scope to the caller's own submissions only. `code` is no longer a column
    // here — it moved to `public.submission_private`, read below.
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('id, problem_id, user_id, language, summary, status, created_at')
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

    // The private half, read under the CALLER'S own token so
    // `submission_private_select_own_or_staff` is what decides, not this route.
    // A row that exists but belongs to someone else comes back as `null` here,
    // which is the same 404 as "no such submission" — the repo's rule that a
    // hidden resource is a 404 and never a 403.
    const { data: priv, error: privErr } = await supabase
      .from('submission_private')
      .select('code, results_full, compile_error')
      .eq('submission_id', id)
      .maybeSingle();

    if (privErr) {
      console.error('Error fetching submission_private:', privErr);
      return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
    }
    if (!priv) {
      // The public row exists and belongs to the caller, so this is not a
      // permissions miss — it is an orphan, which only a failed compensating
      // delete in the submit route can produce. Log it as the defect it is;
      // answer 404, because there is no submission detail to show.
      console.error(
        `Submission ${id} has a public row but no submission_private row. ` +
          `The private write failed and was not compensated — investigate.`,
      );
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
    };

    return NextResponse.json({
      submission: {
        id: submission.id,
        problem_id: submission.problem_id,
        problem_name: problem?.name || 'Unknown Problem',
        language: submission.language,
        // From `submission_private`, not the public row: the caller has been
        // authorised for exactly this data by the policy on that table.
        code: priv.code,
        results: priv.results_full ?? [],
        summary: {
          total: Number(summary.total ?? 0),
          passed: Number(summary.passed ?? 0),
          failed: Number(summary.failed ?? 0),
        },
        compileError: priv.compile_error ?? null,
        created_at: submission.created_at,
      },
    });
  } catch (e) {
    console.error('Submission fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
