import { NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accessToken = authHeader.split(' ')[1];
    const supabase = getServerSupabaseFromToken(accessToken);

    // Verify user is admin
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (adminErr || !adminRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch ALL submissions with user and problem info
    const { data: subs, error: subsErr } = await supabase
      .from('submissions')
      .select('id, created_at, language, summary, status, problems(id,name), users:users(id,username,email)')
      .order('created_at', { ascending: false });

    if (subsErr) {
      console.error('Admin recent submissions error:', subsErr);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    type ProblemRef = { id: string; name: string };
    type UserRef = { id: string; username?: string | null; email?: string | null };
    type SubRow = {
      id: string;
      created_at: string;
      language: string;
      summary: { total?: number; passed?: number; failed?: number } | null;
      status: string | null;
      problems: ProblemRef | ProblemRef[] | null;
      users: UserRef | UserRef[] | null;
    };

    const rows = ((subs || []) as unknown as SubRow[]);

    const submissions = rows.map((s) => {
      const summary = s.summary;
      const total = Number(summary?.total ?? 0);
      const passed = Number(summary?.passed ?? 0);

      return {
        id: s.id,
        created_at: s.created_at,
        user: (Array.isArray(s.users) ? s.users[0]?.username || s.users[0]?.email : s.users?.username || s.users?.email) || 'Unknown User',
        problem: (Array.isArray(s.problems) ? s.problems[0]?.name : s.problems?.name) || 'Unknown Problem',
        language: s.language,
        status: s.status || 'failed',
        score: total > 0 ? `${passed}/${total}` : '—',
        passed: s.status === 'passed',
      };
    });

    return NextResponse.json({ submissions });
  } catch (e) {
    console.error('Admin activity route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
