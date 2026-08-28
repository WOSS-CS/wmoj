import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });

        const auth = await getAdminSupabase(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { supabase } = auth;

        // `code` is no longer a column on `submissions` — it moved to
        // `public.submission_private` along with the full per-case array and any
        // compile error. The public `results` here is redacted to five keys.
        const { data: submission, error: subErr } = await supabase
            .from('submissions')
            .select('id, problem_id, user_id, language, summary, status, created_at')
            .eq('id', id)
            .maybeSingle();

        if (subErr) {
            console.error('Error fetching submission:', subErr);
            return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
        }
        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Read the private half under the CALLER'S OWN token, never the service
        // role: `submission_private_select_own_or_staff` grants it via
        // `public.is_admin()`, which pins `is_active = true`. A deactivated admin is
        // therefore refused by the database rather than by this route, and the
        // null comes back as a 404 — hidden resources are 404, never 403.
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
            // Not a permissions miss — staff can read every row. An orphaned
            // public row can only come from a failed compensating delete in the
            // submit route.
            console.error(
                `Submission ${id} has a public row but no submission_private row. ` +
                    `The private write failed and was not compensated — investigate.`,
            );
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

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
                user_id: submission.user_id,
                language: submission.language,
                code: priv.code,
                results: priv.results_full ?? [],
                summary: {
                    total: Number(summary.total ?? 0),
                    passed: Number(summary.passed ?? 0),
                    failed: Number(summary.failed ?? 0),
                },
                compileError: priv.compile_error ?? null,
                status: submission.status,
                created_at: submission.created_at,
            },
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


// There is deliberately NO `DELETE` export here (H13). `public.submissions` has no
// DELETE policy an active admin can satisfy — only `managers_all_submissions` — so a
// handler would delete zero rows, skip the points recalculation and still answer
// `{"success": true}`. Deleting submissions is a manager operation: the manager twin
// at `api/manager/submissions/[id]` owns it, and no admin client renders a Delete
// control. The principle is general: where an admin cannot satisfy the policy, refuse
// the operation rather than pretend to carry it out.
//
// (This used to cite `api/admin/users/toggle/route.ts` as the sibling example. That
// route was deleted along with the `users.is_active` ban concept, so the citation
// went with it.)
