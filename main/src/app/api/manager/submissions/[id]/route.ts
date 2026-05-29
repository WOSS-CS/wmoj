import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

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
