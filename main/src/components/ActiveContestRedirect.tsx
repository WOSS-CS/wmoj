'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCountdown } from '@/contexts/CountdownContext';

/**
 * Redirects users who are actively participating in a contest
 * back to the contest hub page from anywhere else in the app.
 * Exceptions:
 * - Any route under /contests/[contestId]
 * - Problem pages under /problems/[id] (to allow solving)
 */
export function ActiveContestRedirect() {
  const { isActive, contestId } = useCountdown();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isActive || !contestId || !pathname) return;

    const isOnContestArea = pathname.startsWith(`/contests/${contestId}`);
    const isOnProblemPage = pathname.startsWith('/problems/');
    const isOnPoopthrower = pathname.startsWith('/poopthrower');

    if (!isOnContestArea && !isOnProblemPage && !isOnPoopthrower) {
      router.replace(`/contests/${contestId}`);
    }
  }, [isActive, contestId, pathname, router]);

  return null;
}


