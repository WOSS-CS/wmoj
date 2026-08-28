import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
import { readSubmissionDetail } from '@/lib/submissionDetail';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });

        const auth = await getAdminSupabase(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { supabase } = auth;

        // Staff scope: no `.eq('user_id', …)`. The private half is still read
        // under the CALLER'S OWN token, where
        // `submission_private_select_own_or_staff` grants it via
        // `public.is_admin()` — which pins `is_active = true`, so a deactivated
        // admin is refused by the database rather than by this route.
        const result = await readSubmissionDetail(supabase, id, 'staff');
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

        return NextResponse.json({ submission: result.detail });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


// There is deliberately NO `DELETE` export here: `STAFF_POLICY.admin.mayDeleteSubmission
// === false` (`lib/staffPolicy.ts`). `public.submissions` has no DELETE policy an active
// admin can satisfy — only `managers_all_submissions` — so a handler would delete zero
// rows, skip the points recalculation and still answer `{"success": true}`. The manager
// twin at `api/manager/submissions/[id]` owns the operation. The principle is general:
// where an admin cannot satisfy the policy, refuse rather than pretend to carry it out.
