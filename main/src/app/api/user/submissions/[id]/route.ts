import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/requestAuth';
import { readSubmissionDetail } from '@/lib/submissionDetail';

// GET /api/user/submissions/[id]
//   Returns a single submission — including its source `code` and the FULL
//   per-case judge output — but ONLY when it belongs to the authenticated
//   caller. This backs the user-facing "view my own submission code" feature.
//
//   Ownership is enforced in two places, and neither is on `submissions`:
//     * the `{ ownerId }` scope below, which `readSubmissionDetail` turns into
//       an `.eq('user_id', …)` on the world-readable public row, and
//     * the `submission_private_select_own_or_staff` RLS policy, which is
//       evaluated against the CALLER'S OWN token — this route deliberately does
//       not use the service role, so the database is the real boundary.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });

    const auth = await requireUser(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabase, userId } = auth;

    const result = await readSubmissionDetail(supabase, id, { ownerId: userId });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({ submission: result.detail });
  } catch (e) {
    console.error('Submission fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
