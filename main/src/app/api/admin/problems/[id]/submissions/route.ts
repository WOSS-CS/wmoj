import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const auth = await getAdminSupabase(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { supabase } = auth;

        // Fetch Problem Name
        const { data: problem } = await supabase.from('problems').select('name').eq('id', id).single();
        const problemName = problem?.name || 'Problem';

        // Fetch Submissions
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
