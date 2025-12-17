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
            .select('*')
            .eq('problem_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching submissions:', error);
            return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
        }

        // Collect user IDs
        const userIds = Array.from(new Set(submissions.map((s: any) => s.user_id)));

        // Fetch Users manually
        let userMap: Record<string, { username: string; email: string }> = {};
        if (userIds.length > 0) {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, username, email')
                .in('id', userIds);

            if (!usersError && users) {
                userMap = users.reduce((acc: any, user: any) => {
                    acc[user.id] = { username: user.username, email: user.email };
                    return acc;
                }, {});
            } else {
                console.error('Error fetching users for submissions:', usersError);
            }
        }

        // Transform data
        const formattedSubmissions = submissions.map((sub: any) => {
            const userInfo = userMap[sub.user_id] || { username: 'Unknown', email: 'Unknown' };
            return {
                ...sub,
                username: userInfo.username,
                email: userInfo.email,
            };
        });

        return NextResponse.json({
            submissions: formattedSubmissions,
            problem_name: problemName
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
