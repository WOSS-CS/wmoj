import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });

        const auth = await getManagerSupabase(request);
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
        // `public.is_manager()`, which pins `is_active = true`. A deactivated manager is
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const auth = await getManagerSupabase(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { supabase } = auth;

        const { data: deleted, error } = await supabase
            .from('submissions')
            .delete()
            .eq('id', id)
            .select('user_id')
            .maybeSingle();

        if (error) {
            console.error('Error deleting submission:', error);
            return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
        }

        // RLS filters rather than raising, so "no error" does not mean "a row went".
        // Never report success for a delete that removed nothing.
        if (!deleted) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // DO NOT add a manual `submission_private` delete here. The FK
        // `submission_private.submission_id → submissions(id) ON DELETE CASCADE`
        // has already removed it, and referential actions run as the TABLE OWNER,
        // not under the deleter's RLS — which is the only reason it works, since
        // `submission_private` has no DELETE policy at all. An explicit delete
        // from this client would match zero rows and, checked, would turn every
        // successful deletion into a spurious 500.

        // Recalculate the affected user's stats now that one of their submissions
        // is gone (points and problems_solved are derived from passed submissions).
        // `recalc_user_stats` does both recalculations in one authorised call; the
        // old `recalculate_*` RPCs took an arbitrary uid and are no longer callable.
        if (deleted.user_id) {
            const { error: recalcErr } = await supabase.rpc('recalc_user_stats', { target: deleted.user_id });
            if (recalcErr) console.error(`recalc_user_stats failed for user ${deleted.user_id}:`, recalcErr);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
