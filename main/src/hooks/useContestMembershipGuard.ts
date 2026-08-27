'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCountdown } from '@/contexts/CountdownContext';

/**
 * Send a viewer back to `/contests` when they are looking at a contest problem
 * they are not currently running.
 *
 * Gate on the context's explicit `countdownLoaded` flag, never on
 * `isActive`/`contestId`. Their "not loaded yet" values (`false` / `null`) are
 * indistinguishable from a legitimate "not in a contest", so a guard written
 * against those is true on the very first commit and throws real participants
 * off the page on every hard reload — taking whatever they had typed with it.
 *
 * A virtual run is unrestricted, so the guard does not apply to it.
 */
export function useContestMembershipGuard(
  activeContestId: string | null | undefined,
  isVirtualContest: boolean | undefined,
): void {
  const router = useRouter();
  const { isActive, contestId, countdownLoaded } = useCountdown();

  useEffect(() => {
    if (!activeContestId || isVirtualContest) return;
    if (!countdownLoaded) return;
    if (!isActive || (contestId && contestId !== activeContestId)) router.replace('/contests');
  }, [isActive, contestId, countdownLoaded, activeContestId, router, isVirtualContest]);
}
