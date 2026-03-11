import { getServerSupabase } from '@/lib/supabaseServer';
import ProblemSubmissionsClient from './ProblemSubmissionsClient';

export default async function ProblemSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // Fetch Problem Name
    const { data: problem } = await supabase.from('problems').select('name').eq('id', id).single();
    const problemName = problem?.name || 'Problem';

    // Fetch Submissions
    const { data: submissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('problem_id', id)
        .order('created_at', { ascending: false });

    const rawSubmissions = submissions || [];

    // Collect user IDs
    const userIds = Array.from(new Set(rawSubmissions.map((s: any) => s.user_id)));

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
        }
    }

    // Transform data
    const formattedSubmissions = rawSubmissions.map((sub: any) => {
        const userInfo = userMap[sub.user_id] || { username: 'Unknown', email: 'Unknown' };
        return {
            ...sub,
            username: userInfo.username,
            email: userInfo.email,
        };
    });

    return (
        <ProblemSubmissionsClient 
            initialSubmissions={formattedSubmissions} 
            initialProblemName={problemName} 
        />
    );
}
