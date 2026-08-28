import type { AppSupabaseClient } from '@/types/supabase';

/**
 * Everything that reads or ends one user's contest run.
 *
 * This replaces `utils/timerCheck.ts`, whose two functions were named alike and
 * behaved nothing alike: `checkTimerExpiry` was a pure read, while
 * `getTimerStatus` — documented only by its return value, and reached from a
 * `GET` route the countdown context called on every page load — DELETED the
 * timer row, DELETED the participant row and stamped `join_history.left_at`.
 * The two also carried byte-identical copies of the same arithmetic.
 *
 * The split here is the point:
 *
 * - {@link remainingSeconds} is pure arithmetic and is the only place it lives.
 * - {@link readTimer} READS. One query, no writes, ever. `GET /timer` and the
 *   contest gate use it, so a page render can no longer mutate anything.
 * - {@link expireParticipation} MUTATES, says so in its name, and is reached
 *   only from `POST /leave` and from the orphan branch of `POST /join`.
 *
 * The bulk cleanup that `getTimerStatus` used to do as a side effect now has a
 * server-side owner that does not depend on any one user's browser: the
 * `sweep_expired_participation()` RPC, called at the top of `POST /join` and
 * `POST /leave`. See
 * `supabase/migrations/20260828120905_add_sweep_expired_participation.sql`.
 */

/** The `countdown_timers` columns a reading needs. `is_active` is filtered on, not returned. */
const TIMER_COLUMNS = 'started_at, duration_minutes';

/**
 * How many whole seconds remain on a timer that started at `startedAt` and runs
 * for `durationMinutes`, as of `nowMs`.
 *
 * Pure, and it fails CLOSED in both directions:
 *
 * - a null or unparseable `startedAt` reads as expired (`0`) — the column is
 *   nullable and a row without a start cannot be timed, so it joins the
 *   no-timer case rather than being timed from the epoch;
 * - a `startedAt` in the future (clock skew between the database and this
 *   process) is clamped to the full duration, never more.
 *
 * Never negative.
 */
export function remainingSeconds(
  startedAt: string | null,
  durationMinutes: number,
  nowMs: number,
): number {
  if (startedAt === null) return 0;

  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs)) return 0;

  const totalSeconds = Math.max(0, Math.floor(durationMinutes * 60));
  const elapsedSeconds = Math.floor((nowMs - startMs) / 1000);

  return Math.max(0, Math.min(totalSeconds, totalSeconds - elapsedSeconds));
}

/** The state of one (user, contest) countdown. `remainingSeconds` is 0 whenever `expired`. */
export interface TimerReading {
  expired: boolean;
  remainingSeconds: number;
}

/**
 * PURE READ of `countdown_timers` for one (user, contest). One query, no writes.
 *
 * Fails closed — a query error, a missing row, an unreadable `started_at` or an
 * elapsed window all read as `{ expired: true, remainingSeconds: 0 }`. The
 * contest gate depends on that: "cannot tell" must never mean "still running".
 *
 * The `is_active = true` filter is kept from the code this replaces. Nothing in
 * the app ever writes `is_active = false` (leaving deletes the row outright),
 * so it is a no-op today — but dropping it would be the one change here that
 * fails OPEN, by starting to honour a row somebody had deliberately switched
 * off. The sweep deliberately does NOT consult the column: it removes an
 * expired row whatever its flag says.
 */
export async function readTimer(
  supabase: AppSupabaseClient,
  userId: string,
  contestId: string,
): Promise<TimerReading> {
  const { data: timer, error } = await supabase
    .from('countdown_timers')
    .select(TIMER_COLUMNS)
    .eq('user_id', userId)
    .eq('contest_id', contestId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[contestTimer] countdown_timers read failed:', error);
    return { expired: true, remainingSeconds: 0 };
  }
  if (!timer) {
    return { expired: true, remainingSeconds: 0 };
  }

  const remaining = remainingSeconds(timer.started_at, timer.duration_minutes, Date.now());
  return { expired: remaining <= 0, remainingSeconds: remaining };
}

/**
 * MUTATES. Ends one user's run of one contest, in the order the sweep uses:
 * stamp the history row, remove the participant row, remove the timer. The
 * timer is what identifies the other two, so it goes last.
 *
 * Idempotent — calling it on a run that has already ended changes nothing and
 * still reports `ok`.
 *
 * Runs under the CALLER'S OWN token; the owner policies on all three tables
 * allow exactly these writes. Every write's error is read, because supabase-js
 * resolves with `{ error }` rather than throwing.
 *
 * `left_at` is stamped `now()`, which is the instant a VOLUNTARY leave ends the
 * run — this function's callers are `POST /leave` and the orphan branch of
 * `POST /join`, and in both a run whose window closed on its own has already
 * been stamped with its true end by `sweep_expired_participation()`. That is
 * why the update carries `.is('left_at', null)`: without it, a user returning
 * hours after their contest ended and hitting `/leave` would overwrite the
 * sweep's correct end instant with `now()` and silently extend their
 * leaderboard scoring window. A rejoin resets `left_at` to null, so the filter
 * does not block a second, legitimate run.
 */
export async function expireParticipation(
  supabase: AppSupabaseClient,
  userId: string,
  contestId: string,
): Promise<{ ok: boolean }> {
  // `.select()` is what makes a refusal visible: an UPDATE filtered away by RLS
  // reports no error, just zero rows. Checking only `.error` is how `left_at`
  // silently stayed NULL for every row in the first place.
  const { data: stamped, error: historyErr } = await supabase
    .from('join_history')
    .update({ left_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('contest_id', contestId)
    .is('left_at', null)
    .select('id');

  if (historyErr) {
    console.error('[contestTimer] join_history left_at update failed:', historyErr);
  }

  const { data: removed, error: participantErr } = await supabase
    .from('contest_participants')
    .delete()
    .eq('user_id', userId)
    .eq('contest_id', contestId)
    .select('contest_id');

  if (participantErr) {
    // The only fatal one. Everything downstream — the gate, the participants
    // count, the "already joined another contest" probe — keys off this row.
    console.error('[contestTimer] contest_participants delete failed:', participantErr);
    return { ok: false };
  }

  const { error: timerErr } = await supabase
    .from('countdown_timers')
    .delete()
    .eq('user_id', userId)
    .eq('contest_id', contestId);

  if (timerErr) {
    // Not fatal: with the participant row gone the timer grants nothing, the
    // sweep removes it once its window closes, and a rejoin upserts over it
    // with an explicit onConflict.
    console.error('[contestTimer] countdown_timers delete failed:', timerErr);
  }

  // Stamping zero rows is normal when the sweep already ended this run (the
  // `.is('left_at', null)` filter above). It is only notable when a participant
  // row was actually removed here and there was still nothing to stamp, which
  // means the history row is missing or was ended without the participation
  // being cleared.
  if (!historyErr && (removed?.length ?? 0) > 0 && (stamped?.length ?? 0) === 0) {
    console.error(
      '[contestTimer] removed a participant with no unstamped join_history row for',
      { userId, contestId },
    );
  }

  return { ok: true };
}
