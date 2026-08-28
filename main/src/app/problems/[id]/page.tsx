import { getServerSupabase } from '@/lib/supabaseServer';
import ProblemDetailClient from './ProblemDetailClient';
import { canUserAccessProblem } from '@/lib/problemAccess';
import { checkContestGate, getContestIdsForProblem } from '@/lib/contestGate';
import { countProblemTestCases } from '@/lib/supabaseAdmin';
import { Problem } from '@/types/problem';
import { notFound, redirect } from 'next/navigation';

/**
 * The only columns this page may select. The whole row is passed to
 * `ProblemDetailClient`, and React serialises every prop into the RSC flight
 * payload, so anything listed here lands in the page source. The graded columns
 * were dropped from `problems` and now live in the staff-only `problem_tests`,
 * which is why the test-case count the sidebar needs is fetched separately as a
 * server-computed scalar. Never widen this to `*`, and never add a column here
 * that the client does not actually render.
 */
const PROBLEM_COLUMNS =
  'id, name, content, points, time_limit, memory_limit, created_at, is_active, created_by';

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [problemResult, authResult, contestIds] = await Promise.all([
    supabase
      .from('problems')
      .select(PROBLEM_COLUMNS)
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
    getContestIdsForProblem(supabase, id),
  ]);

  const { data: problemRow, error } = problemResult;

  if (error || !problemRow) {
    notFound();
  }

  const problem = problemRow as unknown as Problem;

  // Who is asking, and may they see this problem at all? (An unpublished
  // problem is staff-only; the contest gate below is a separate question.)
  const { data: authUser } = authResult;
  const user = authUser?.user;

  const hasAccess = await canUserAccessProblem(supabase, problem, user?.id ?? null);
  if (!hasAccess) {
    notFound();
  }

  // The contest gate. An unstarted contest hides its problems from everyone but
  // active staff; a live one admits only participants whose timer is still
  // running. `lib/contestGate.ts` makes the decision and this page maps it onto
  // the outcomes a server component has — `notFound()` and `redirect()` throw,
  // so they stay here rather than move inside the helper.
  const gate = await checkContestGate(supabase, { contestIds, userId: user?.id ?? null });
  if (gate.kind === 'hidden') {
    notFound();
  }
  // Signed out, or signed in and not entered: either way there is no contest
  // session to render this problem in, so back to the list.
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

  // Fetch best submission and comments in parallel
  const [subsResult, commentsResult] = await Promise.all([
    user
      ? supabase
          .from('submissions')
          .select('summary')
          .eq('user_id', user.id)
          .eq('problem_id', problem.id)
      : Promise.resolve({ data: null }),
    supabase
      .from('comments')
      .select('id, problem_id, user_id, parent_id, body, score, created_at, updated_at, users(username)')
      .eq('problem_id', id)
      .order('created_at', { ascending: true }),
  ]);

  let bestSummary = null;
  const { data: subs } = subsResult;
  if (subs && subs.length > 0) {
    for (const row of subs) {
      const s = row.summary as { total?: number; passed?: number; failed?: number } | null;
      if (!s) continue;
      const current = { total: Number(s.total ?? 0), passed: Number(s.passed ?? 0), failed: Number(s.failed ?? 0) };
      // A compile error is stored as {total: 0, passed: 0, failed: 0, verdict: 'CE'}.
      // That object is truthy, so it used to survive as `bestSummary` and render
      // a green 0/0 at NaN% — "solved" for a submission that never compiled.
      // Nothing was graded, so it is not a candidate for "best submission".
      if (current.total <= 0) continue;
      if (!bestSummary || current.passed > bestSummary.passed || (current.passed === bestSummary.passed && current.total > bestSummary.total)) {
        bestSummary = current;
      }
    }
  }

  const { data: rawComments } = commentsResult;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const initialComments = (rawComments || []).map((c: Record<string, unknown>) => {
    const users = c.users as { username: string } | null;
    return {
      id: c.id as string,
      problem_id: c.problem_id as string,
      user_id: c.user_id as string,
      parent_id: (c.parent_id as string) || null,
      body: c.body as string,
      score: c.score as number,
      created_at: c.created_at as string,
      updated_at: c.updated_at as string,
      username: users?.username || 'Unknown',
      avatar_url: `${supabaseUrl}/storage/v1/object/public/avatars/${c.user_id}/avatar`,
    };
  });

  // Server-computed scalar: the sidebar shows how many test cases a problem has,
  // and that is the ONLY thing about the test set a public page may learn. The
  // arrays themselves never leave the server. `null` means the count could not be
  // read at all (no service-role key, or no `problem_tests` row) and renders as
  // an em dash — never as `0`, which would read as a deliberate "no tests".
  const testCaseCount = await countProblemTestCases(problem.id);

  return (
    <ProblemDetailClient
      problem={problem}
      testCaseCount={testCaseCount}
      activeContestId={activeContestId}
      initialBestSummary={bestSummary}
      isVirtualContest={isVirtualContest}
      initialComments={initialComments}
    />
  );
}
