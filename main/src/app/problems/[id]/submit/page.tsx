import { getServerSupabase } from '@/lib/supabaseServer';
import SubmitClient from './SubmitClient';
import { canUserAccessProblem } from '@/lib/problemAccess';
import { checkContestGate, getContestIdsForProblem } from '@/lib/contestGate';
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

  const [problemResult, authResult, contestIds] = await Promise.all([
    supabase.from('problems').select(PROBLEM_COLUMNS).eq('id', id).single(),
    supabase.auth.getUser(),
    getContestIdsForProblem(supabase, id),
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

  // The contest gate. This is the page students submit FROM, so the stake is
  // higher than on the statement page: without the `upcoming` arm an entrant
  // could solve and bank points for a scheduled contest's problems days early
  // and walk in already finished. `notFound()` and `redirect()` throw, so they
  // stay here rather than move inside the helper.
  const gate = await checkContestGate(supabase, { contestIds, userId: user.id });
  if (gate.kind === 'hidden') {
    notFound();
  }
  if (gate.kind === 'notParticipant') {
    redirect('/problems');
  }
  if (gate.kind === 'expired') {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error">Contest time has expired</p>
      </div>
    );
  }
  const { activeContestId, isVirtualContest } = gate;

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
