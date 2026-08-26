import { getServerSupabase } from '@/lib/supabaseServer';
import SubmitClient from './SubmitClient';
import { checkTimerExpiry } from '@/utils/timerCheck';
import { getContestStatus } from '@/utils/contestStatus';
import { canUserAccessProblem } from '@/lib/problemAccess';
import { isActiveAdmin, isActiveManager } from '@/lib/staffAuth';
import { notFound, redirect } from 'next/navigation';

/**
 * The only columns this page may select. This is the page students submit FROM,
 * and selecting the answer key here once put the expected stdout for every test
 * case into its page source. Those columns are gone from `problems` now — they
 * live in the staff-only `problem_tests`, readable only through
 * `lib/supabaseAdmin.ts` on the server — so the leak cannot be recreated from
 * this table. Everything below is used server-side for the access gate; only
 * `id` and `name` cross into the client. Never widen this to `*`.
 */
const PROBLEM_COLUMNS = 'id, name, is_active, created_by, time_limit, memory_limit';

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [problemResult, authResult, cpResult] = await Promise.all([
    supabase.from('problems').select(PROBLEM_COLUMNS).eq('id', id).single(),
    supabase.auth.getUser(),
    supabase.from('contest_problems').select('contest_id').eq('problem_id', id),
  ]);

  const { data: problem, error } = problemResult;

  if (error || !problem) {
    notFound();
  }

  const { data: authUser } = authResult;
  const user = authUser?.user;

  if (!user) {
    redirect('/auth/login');
  }

  const hasAccess = await canUserAccessProblem(supabase, problem, user.id);
  if (!hasAccess) {
    notFound();
  }

  // Determine if this problem is in any ongoing contest
  const contestIds = (cpResult.data || []).map((r: { contest_id: string }) => r.contest_id);
  let activeContestId: string | null = null;
  let isVirtualContest = true;

  if (contestIds.length > 0) {
    const { data: contests } = await supabase
      .from('contests')
      .select('id, is_active, starts_at, ends_at')
      .in('id', contestIds);

    const statusOf = (c: unknown) =>
      getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null });

    // A contest that has not started yet accepts no submissions from anyone —
    // participation is impossible before the start bell, so there is nothing to
    // check and a non-staff caller gets a hard 404 (hidden resources are 404,
    // never 403). Without this, an entrant could solve and bank points for a
    // scheduled contest's problems days early and walk in already finished.
    if ((contests || []).some(c => statusOf(c) === 'upcoming')) {
      const isStaff =
        (await isActiveManager(supabase, user.id)) || (await isActiveAdmin(supabase, user.id));
      if (!isStaff) {
        notFound();
      }
    }

    const ongoingContests = (contests || []).filter(c => statusOf(c) === 'ongoing');

    if (ongoingContests.length > 0) {
      isVirtualContest = false;

      for (const contest of ongoingContests) {
        const [participantResult, timerResult] = await Promise.all([
          supabase
            .from('contest_participants')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('contest_id', contest.id)
            .maybeSingle(),
          checkTimerExpiry(supabase, user.id, contest.id),
        ]);

        const { data: participant } = participantResult;
        if (participant) {
          const { expired } = timerResult;
          if (expired) {
            return (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
                <p className="text-sm text-error">Contest time has expired</p>
              </div>
            );
          }
          activeContestId = contest.id;
          break;
        }
      }

      if (!activeContestId) {
        redirect('/problems');
      }
    }
  }

  // Narrowed explicitly at the boundary: the client needs the id and the name and
  // nothing else, and an explicit object here means a future column added to
  // PROBLEM_COLUMNS for a server-side gate cannot drift into the browser.
  return (
    <SubmitClient
      problem={{ id: problem.id as string, name: problem.name as string }}
      activeContestId={activeContestId}
      isVirtualContest={isVirtualContest}
    />
  );
}
