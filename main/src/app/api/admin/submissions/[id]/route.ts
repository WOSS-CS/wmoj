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


// There is deliberately NO `DELETE` export here (H13). `public.submissions` has no
// DELETE policy an active admin can satisfy — only `managers_all_submissions` — so a
// handler would delete zero rows, skip the points recalculation and still answer
// `{"success": true}`. Deleting submissions is a manager operation: the manager twin
// at `api/manager/submissions/[id]` owns it, and no admin client renders a Delete
// control. This mirrors `api/admin/users/toggle/route.ts`, which likewise refuses an
// operation admins may not perform rather than pretending to carry it out.
