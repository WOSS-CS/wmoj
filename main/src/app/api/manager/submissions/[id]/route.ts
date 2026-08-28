import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { readSubmissionDetail } from '@/lib/submissionDetail';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });

        const auth = await getManagerSupabase(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { supabase } = auth;

        // Staff scope: no `.eq('user_id', …)`. The private half is still read
        // under the CALLER'S OWN token, where
        // `submission_private_select_own_or_staff` grants it via
        // `public.is_manager()` — which pins `is_active = true`, so a deactivated
        // manager is refused by the database rather than by this route.
        const result = await readSubmissionDetail(supabase, id, 'staff');
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

        return NextResponse.json({ submission: result.detail });
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
