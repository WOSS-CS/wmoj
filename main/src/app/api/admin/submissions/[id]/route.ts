import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const auth = await getAdminSupabase(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { supabase } = auth;

        // Delete Submission
        const { error } = await supabase
            .from('submissions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting submission:', error);
            return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
