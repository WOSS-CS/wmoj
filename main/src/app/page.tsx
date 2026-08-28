import { getServerSupabase } from '@/lib/supabaseServer';
import DashboardClient from './DashboardClient';
import { CONTEST_SCHEDULE_COLUMNS, type ContestScheduleRow } from '@/lib/queries/contests';
import { NEWS_POST_FEED_COLUMNS } from '@/lib/queries/newsPosts';
import { PROBLEM_RECENT_COLUMNS, type ProblemRecentRow } from '@/lib/queries/problems';
import { getContestStatus } from '@/utils/contestStatus';

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  date_posted: string;
  users: { username: string } | { username: string }[];
}

/** {@link CONTEST_SCHEDULE_COLUMNS}. */
export type CompactContest = ContestScheduleRow;

/** {@link PROBLEM_RECENT_COLUMNS}. */
export type CompactProblem = ProblemRecentRow;

export default async function HomePage() {
  const supabase = await getServerSupabase();

  let initialNewsPosts: NewsPost[] = [];
  let ongoingContests: CompactContest[] = [];
  let upcomingContests: CompactContest[] = [];
  let recentProblems: CompactProblem[] = [];

  const [newsResult, contestsResult, problemsResult] = await Promise.all([
    supabase
      .from('news_posts')
      .select(NEWS_POST_FEED_COLUMNS)
      .order('date_posted', { ascending: false })
      .limit(10),
    supabase
      .from('contests')
      .select(CONTEST_SCHEDULE_COLUMNS)
      .eq('is_active', true),
    supabase
      .from('problems')
      .select(PROBLEM_RECENT_COLUMNS)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  if (!newsResult.error && newsResult.data) {
    initialNewsPosts = newsResult.data;
  }

  if (!problemsResult.error && problemsResult.data) {
    recentProblems = problemsResult.data;
  }

  if (!contestsResult.error && contestsResult.data) {
    const allActive = contestsResult.data;
    allActive.forEach(c => {
      const status = getContestStatus(c);
      if (status === 'ongoing') ongoingContests.push(c);
      if (status === 'upcoming') upcomingContests.push(c);
    });

    // Sort ongoing by ends_at ascending (ending soonest first)
    ongoingContests.sort((a, b) => {
      if (!a.ends_at) return 1;
      if (!b.ends_at) return -1;
      return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
    });

    // Sort upcoming by starts_at ascending (starting soonest first)
    upcomingContests.sort((a, b) => {
      if (!a.starts_at) return 1;
      if (!b.starts_at) return -1;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });

    // Limit to 5
    ongoingContests = ongoingContests.slice(0, 5);
    upcomingContests = upcomingContests.slice(0, 5);
  }

  return (
    <DashboardClient 
      initialNewsPosts={initialNewsPosts} 
      ongoingContests={ongoingContests}
      upcomingContests={upcomingContests}
      recentProblems={recentProblems}
    />
  );
}
