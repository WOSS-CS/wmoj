import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Auth Check
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const supabase = getServerSupabaseFromToken(token);

        // Verify Admin
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: adminData } = await supabase
            .from('admins')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!adminData) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

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
