import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });

        const auth = await getManagerSupabase(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { supabase } = auth;

        const { data: submission, error: subErr } = await supabase
            .from('submissions')
            .select('id, problem_id, user_id, language, code, results, summary, status, created_at')
            .eq('id', id)
            .maybeSingle();

        if (subErr) {
            console.error('Error fetching submission:', subErr);
            return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
        }
        if (!submission) {
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
            compileError?: string;
        };

        return NextResponse.json({
            submission: {
                id: submission.id,
                problem_id: submission.problem_id,
                problem_name: problem?.name || 'Unknown Problem',
                user_id: submission.user_id,
                language: submission.language,
                code: submission.code,
                results: submission.results ?? [],
                summary: {
                    total: Number(summary.total ?? 0),
                    passed: Number(summary.passed ?? 0),
                    failed: Number(summary.failed ?? 0),
                },
                compileError: summary.compileError ?? null,
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
