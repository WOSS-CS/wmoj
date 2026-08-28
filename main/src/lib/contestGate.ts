import type { AppSupabaseClient } from '@/types/supabase';
import { CONTEST_GATE_COLUMNS } from '@/lib/queries/contests';
import { getContestStatus } from '@/utils/contestStatus';
import { readTimer } from '@/lib/contestTimer';
import { isActiveAdmin, isActiveManager } from '@/lib/staffAuth';

/**
 * The contest access gate for a single problem.
 *
 * A problem belongs to contests through the `contest_problems` junction — there
 * is no `contest` column on `problems` — and its own `is_active` flag says
 * nothing about whether the contests holding it have opened yet. This gate is
 * what turns "the problem row is readable" into "this caller may see it right
 * now", and it ran as three hand-copied 63-71 line blocks (the problem page, the
 * submit page and the submit API route) that had already drifted from one
 * another. It is one function now so the three cannot drift again.
 *
 * The three call sites answer differently — `notFound()`, `redirect()`, a 403
 * JSON body — so the gate returns a {@link ContestGateResult} and each caller
 * maps it to its own outcome.
 *
 * Every rule below is load-bearing:
 *
 * - **An `upcoming` contest hides its problems exactly as hard as an `ongoing`
 *   one does.** Every gate in this app once compared against `'ongoing'` only,
 *   so a scheduled contest's problems were ordinary standalone problems right up
 *   to the start bell: publicly listed, readable, and — through the submit route
 *   — accepted and SCORED, with rows persisted and points awarded, because
 *   `problems.is_active` was true. An organiser preparing a contest ahead of
 *   time (exactly what they are supposed to do) opened that window themselves.
 *
 * - **Hidden means 404, never 403.** Participation is impossible before a
 *   contest starts, so there is no participant check to make and nothing to
 *   explain to the caller: a non-staff caller gets a hard `hidden`, matching how
 *   `canUserAccessProblem` / `canUserAccessContest` treat every other hidden
 *   resource. Staff keep access so they can test their own problems.
 *
 * - **Staff means ACTIVE staff.** `isActiveManager` / `isActiveAdmin` pin
 *   `is_active = true` on the `admins` / `managers` row; a bare membership check
 *   would hand a deactivated manager their access back.
 *
 * - **Every lookup here fails closed.** `readTimer` treats a missing timer, an
 *   unreadable one, or any error reading it, as `expired`. The two queries here
 *   do the same: a failed `contest_problems` read throws rather than reporting
 *   "belongs to no contest", and a failed `contests` read returns `hidden`
 *   rather than `standalone()`. Both discarded their errors in all three
 *   original copies, and both discards opened the contest.
 */

/**
 * What the caller is allowed to do with the problem.
 *
 * - `allowed` — render/accept it. `activeContestId` is the ongoing contest the
 *   caller is competing in, or `null` when the problem is being solved outside
 *   any live contest (`isVirtualContest`).
 * - `hidden` — an unstarted contest holds this problem and the caller is not
 *   active staff. A 404, never a 403.
 * - `notParticipant` — a live contest holds this problem and the caller has not
 *   joined it (or is signed out, which is the same thing: nobody who is not
 *   signed in can be a participant).
 * - `expired` — the caller joined, but their countdown timer has run out.
 */
export type ContestGateResult =
  | { kind: 'allowed'; activeContestId: string | null; isVirtualContest: boolean }
  | { kind: 'hidden' }
  | { kind: 'notParticipant' }
  | { kind: 'expired' };

/** Solving outside any live contest: no active contest, virtual scoring. */
function standalone(): ContestGateResult {
  return { kind: 'allowed', activeContestId: null, isVirtualContest: true };
}

/**
 * The contests a problem belongs to. Separate from {@link checkContestGate} so
 * the two server components can start it in the same `Promise.all` as their
 * problem and auth lookups instead of paying an extra round-trip for it.
 */
export async function getContestIdsForProblem(
  supabase: AppSupabaseClient,
  problemId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('contest_problems')
    .select('contest_id')
    .eq('problem_id', problemId);

  // THROW, do not return []. An empty array is the legitimate answer for a
  // standalone problem, so swallowing the error here is indistinguishable from
  // "belongs to no contest" — and that answer routes straight to `standalone()`,
  // which is `allowed`. A transient read failure would hand out a live contest's
  // problem. All three callers turn a throw into an error response.
  if (error) {
    console.error('[contestGate] contest_problems lookup failed for problem', problemId, error);
    throw new Error('Contest membership lookup failed');
  }

  return (data || []).map((r: { contest_id: string }) => r.contest_id);
}

/**
 * Decide whether `userId` may see/use a problem right now, given the contests it
 * belongs to. Pass the caller's own Supabase client — the cookie client in a
 * server component, the bearer-token client in a route handler — so the gate is
 * evaluated under the caller's own RLS, exactly as it was inline.
 *
 * @param contestIds from {@link getContestIdsForProblem}
 * @param userId the signed-in user, or `null` for an anonymous caller
 */
export async function checkContestGate(
  supabase: AppSupabaseClient,
  { contestIds, userId }: { contestIds: string[]; userId: string | null },
): Promise<ContestGateResult> {
  if (contestIds.length === 0) return standalone();

  const { data, error } = await supabase.from('contests').select(CONTEST_GATE_COLUMNS).in('id', contestIds);

  // FAIL CLOSED. `contestIds` is non-empty here, so this problem provably belongs
  // to at least one contest. A discarded error yields no rows, hence no
  // `upcoming` and no `ongoing`, hence `standalone()` — the problem of a live or
  // unstarted contest served as an ordinary practice problem, and through the
  // submit route, scored. `hidden` is the safe answer: the callers render it as
  // a 404, which is what a non-staff caller would have seen anyway.
  if (error) {
    console.error('[contestGate] contest lookup failed for', contestIds, error);
    return { kind: 'hidden' };
  }

  // Status is computed once per contest and reused, so a contest whose start
  // bell rings mid-request cannot be read as `upcoming` by one check and
  // `ongoing` by the next.
  const contests = (data || []).map((contest) => ({
    contest,
    status: getContestStatus(contest),
  }));

  if (contests.some((c) => c.status === 'upcoming')) {
    const isStaff =
      !!userId &&
      ((await isActiveManager(supabase, userId)) || (await isActiveAdmin(supabase, userId)));
    if (!isStaff) return { kind: 'hidden' };
  }

  const ongoing = contests.filter((c) => c.status === 'ongoing').map((c) => c.contest);
  if (ongoing.length === 0) return standalone();

  // Nobody who is not signed in can hold a `contest_participants` row, so there
  // is nothing to look up.
  if (!userId) return { kind: 'notParticipant' };

  for (const contest of ongoing) {
    const [participantResult, timerResult] = await Promise.all([
      supabase
        .from('contest_participants')
        .select('user_id')
        .eq('user_id', userId)
        .eq('contest_id', contest.id)
        .maybeSingle(),
      readTimer(supabase, userId, contest.id),
    ]);

    if (participantResult.data) {
      if (timerResult.expired) return { kind: 'expired' };
      return { kind: 'allowed', activeContestId: contest.id, isVirtualContest: false };
    }
  }

  return { kind: 'notParticipant' };
}
