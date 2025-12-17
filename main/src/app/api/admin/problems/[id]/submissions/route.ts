import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        // Fetch Problem Name
        const { data: problem } = await supabase.from('problems').select('name').eq('id', id).single();
        const problemName = problem?.name || 'Problem';

        // Fetch Submissions
        // Attempting to join with users table. If FK exists, this works.
        // users table is expected to have 'username' and 'email'.
        // If this fails (e.g. no FK), we might need to adjust.
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`
        *,
        users:user_id (
          username,
          email
        )
      `)
            .eq('problem_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching submissions:', error);
            return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
        }

        // Transform data to flatten user object
        const formattedSubmissions = submissions.map((sub: any) => ({
            ...sub,
            username: sub.users?.username || 'Unknown',
            email: sub.users?.email || 'Unknown',
        }));

        return NextResponse.json({
            submissions: formattedSubmissions,
            problem_name: problemName
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
