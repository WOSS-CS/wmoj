import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });

        const auth = await getAdminSupabase(request);
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

        const auth = await getAdminSupabase(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { supabase } = auth;

        // Delete Submission
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

        // Recalculate the affected user's stats now that one of their submissions
        // is gone (points and problems_solved are derived from passed submissions).
        if (deleted?.user_id) {
            const { error: solvedErr } = await supabase.rpc('recalculate_problems_solved', { uid: deleted.user_id });
            const { error: pointsErr } = await supabase.rpc('recalculate_user_points', { uid: deleted.user_id });
            if (solvedErr) console.error('recalculate_problems_solved error:', solvedErr);
            if (pointsErr) console.error('recalculate_user_points error:', pointsErr);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
