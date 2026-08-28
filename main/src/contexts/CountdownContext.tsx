'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface TimerStatusResponse {
  isActive: boolean;
  remainingSeconds?: number;
  contestName?: string;
}

interface CountdownContextType {
  timeRemaining: number | null;
  contestName: string | null;
  isActive: boolean;
  contestId: string | null;
  /**
   * False until the mount-time restore has finished (or failed), true forever after.
   *
   * Any consumer that acts on the *absence* of a contest — a redirect away from a
   * contest problem page, a "you are not competing" branch — must gate on this and
   * do nothing while it is false. `isActive` is a plain `boolean` initialised
   * `false` and `contestId` a `string | null` initialised `null`, so their
   * "not loaded yet" state is indistinguishable from a legitimate "not in a
   * contest": inferring readiness from them redirects real participants off their
   * own problem pages on every hard reload. Never re-derive readiness from the
   * other fields — read this flag.
   */
  countdownLoaded: boolean;
  startCountdown: (contestId: string, contestName: string, durationMinutes: number) => void;
  stopCountdown: () => void;
  pauseCountdown: () => void;
  resumeCountdown: () => void;
  isPaused: boolean;
  totalDuration: number | null;
  progressPercentage: number;
  syncWithServer: () => Promise<void>;
}

const CountdownContext = createContext<CountdownContextType | undefined>(undefined);

export function CountdownProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [contestName, setContestName] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [contestId, setContestId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [countdownLoaded, setCountdownLoaded] = useState(false);

  // Absolute epoch (ms) at which the countdown ends. The tick derives the
  // remaining seconds from Date.now() against this rather than decrementing
  // state, so a late interval callback, a throttled background tab or a slow
  // render cannot make the contest run long (nor snap backwards at each sync).
  const deadlineRef = useRef<number | null>(null);
  // Remaining ms captured at pause, so resuming shifts the deadline forward.
  const pausedRemainingMsRef = useRef<number | null>(null);
  // Expiry POSTs /leave and then navigates; guard it so a tick can only fire it once.
  const expiredRef = useRef(false);

  // Derived, not state: computing it in an effect meant an extra render per
  // second and a stale value on the frame the timer changed.
  const progressPercentage = totalDuration && timeRemaining !== null
    ? Math.min(100, Math.max(0, ((totalDuration - timeRemaining) / totalDuration) * 100))
    : 0;

  const resetState = useCallback(() => {
    deadlineRef.current = null;
    pausedRemainingMsRef.current = null;
    expiredRef.current = false;
    setContestId(null);
    setContestName(null);
    setTimeRemaining(null);
    setIsActive(false);
    setIsPaused(false);
    setTotalDuration(null);
  }, []);

  const applyTimerStatus = useCallback((remainingSeconds: number, name?: string | null) => {
    deadlineRef.current = Date.now() + remainingSeconds * 1000;
    pausedRemainingMsRef.current = null;
    expiredRef.current = false;
    setTimeRemaining(remainingSeconds);
    setIsActive(true);
    setIsPaused(false);
    if (name) setContestName(name);
  }, []);

  /** Reads the server's authoritative timer for a contest. Null when unavailable. */
  const fetchTimerStatus = useCallback(async (targetContestId: string): Promise<TimerStatusResponse | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return null;

    const response = await fetch(`/api/contests/${targetContestId}/timer`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    return (await response.json()) as TimerStatusResponse;
  }, []);

  const syncWithServer = useCallback(async () => {
    if (!user?.id || !contestId) return;

    try {
      const data = await fetchTimerStatus(contestId);
      if (!data) return;

      if (data.isActive && (data.remainingSeconds ?? 0) > 0) {
        applyTimerStatus(data.remainingSeconds as number, data.contestName);
      } else {
        // The server is authoritative: the timer is done or gone. Leave
        // contestId alone — participation is the DB's call, not the timer's.
        deadlineRef.current = null;
        setIsActive(false);
        setTimeRemaining(null);
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  }, [user?.id, contestId, fetchTimerStatus, applyTimerStatus]);

  const startCountdown = useCallback((id: string, name: string, durationMinutes: number) => {
    const durationSeconds = durationMinutes * 60;
    setContestId(id);
    setContestName(name);
    setTotalDuration(durationSeconds);
    applyTimerStatus(durationSeconds, name);

    // POST /api/contests/[id]/join is what actually creates the timer row, so
    // re-read it and let the server's started_at win. This used to be a
    // setTimeout(() => syncWithServer(), 1000) whose closure still had
    // contestId === null, making the post-join sync a permanent no-op.
    void (async () => {
      try {
        const data = await fetchTimerStatus(id);
        if (data?.isActive && (data.remainingSeconds ?? 0) > 0) {
          applyTimerStatus(data.remainingSeconds as number, data.contestName ?? name);
        }
      } catch (error) {
        console.error('Error syncing countdown after join:', error);
      }
    })();
  }, [applyTimerStatus, fetchTimerStatus]);

  const stopCountdown = useCallback(() => {
    // Timer cleanup itself is handled by the leave API endpoint.
    resetState();
  }, [resetState]);

  const pauseCountdown = useCallback(() => {
    if (deadlineRef.current !== null) {
      pausedRemainingMsRef.current = Math.max(0, deadlineRef.current - Date.now());
    }
    setIsPaused(true);
  }, []);

  const resumeCountdown = useCallback(() => {
    if (pausedRemainingMsRef.current !== null) {
      deadlineRef.current = Date.now() + pausedRemainingMsRef.current;
      pausedRemainingMsRef.current = null;
    }
    setIsPaused(false);
  }, []);

  /**
   * POSTs `/api/contests/[id]/leave`, the one route that ends a participation.
   * Returns whether the server accepted it.
   *
   * Two callers want the request and only one wants the navigation, so the
   * request lives here on its own: the tick's {@link checkExpiration} sends the
   * user back to `/contests` afterwards, while the mount-time restore below
   * only clears state — it can run on any page in the app.
   */
  const postLeave = useCallback(async (targetContestId: string): Promise<boolean> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(`/api/contests/${targetContestId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) console.error('Failed to leave contest:', res.status);
    return res.ok;
  }, []);

  const checkExpiration = useCallback(async () => {
    if (!contestId || !user?.id) return;

    try {
      const ok = await postLeave(contestId);

      if (ok) {
        stopCountdown();
        window.location.href = '/contests';
      }
      // Don't retry from the tick — that would POST once a second. The 30s
      // server sync below sees the expired timer and clears the state.
    } catch (error) {
      console.error('Error leaving contest:', error);
    }
  }, [contestId, user?.id, postLeave, stopCountdown]);

  // Restore the countdown from the server on mount (and whenever the signed-in
  // user changes). Gated on authLoading: on a hard reload `user` is null until
  // AuthContext's INITIAL_SESSION lands, and marking the countdown loaded
  // against that null would defeat the whole point of countdownLoaded.
  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    (async () => {
      try {
        if (!user?.id) {
          resetState();
          return;
        }

        const { data: participant, error } = await supabase
          .from('contest_participants')
          .select('contest_id')
          .eq('user_id', user.id)
          .limit(1);

        if (!isMounted) return;
        if (error || !participant || participant.length === 0) return;

        const activeContestId = participant[0].contest_id as string;
        setContestId(prev => (prev !== activeContestId ? activeContestId : prev));

        const data = await fetchTimerStatus(activeContestId);
        if (!isMounted || !data) return;

        if (data.isActive && (data.remainingSeconds ?? 0) > 0) {
          applyTimerStatus(data.remainingSeconds as number, data.contestName);
          return;
        }

        // A participant row with a countdown the server reports as finished.
        // `GET /timer` is a pure read now, so nothing cleans this up on a page
        // load any more — without this the row lingers until somebody joins or
        // leaves a contest anywhere, and `/contests` keeps offering the user a
        // stale "Continue →". POST the same `/leave` the tick sends at zero.
        // This is an extra trigger for the mutation route, not a write from a
        // read path, and it cannot loop: `resetState` is a stable callback and
        // this effect depends on neither the state it clears nor anything the
        // request changes.
        await postLeave(activeContestId);
        if (isMounted) resetState();
      } catch (error) {
        console.error('Error loading active contest:', error);
      } finally {
        if (isMounted) setCountdownLoaded(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.id, resetState, fetchTimerStatus, applyTimerStatus, postLeave]);

  // Display tick. Depends only on [isActive, isPaused, checkExpiration] — the
  // remaining time lives in deadlineRef, so the interval is created once per
  // contest instead of being torn down and rebuilt on every single tick.
  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        void checkExpiration();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, checkExpiration]);

  // Periodic sync with the server to prevent drift (every 30 seconds).
  useEffect(() => {
    if (!isActive || !contestId) return;

    const syncInterval = setInterval(() => {
      void syncWithServer();
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [isActive, contestId, syncWithServer]);

  // Memoised: an unmemoised literal re-rendered every useCountdown() consumer
  // once per second for the whole contest.
  const value = useMemo<CountdownContextType>(() => ({
    timeRemaining,
    contestName,
    isActive,
    contestId,
    countdownLoaded,
    startCountdown,
    stopCountdown,
    pauseCountdown,
    resumeCountdown,
    isPaused,
    totalDuration,
    progressPercentage,
    syncWithServer,
  }), [
    timeRemaining,
    contestName,
    isActive,
    contestId,
    countdownLoaded,
    startCountdown,
    stopCountdown,
    pauseCountdown,
    resumeCountdown,
    isPaused,
    totalDuration,
    progressPercentage,
    syncWithServer,
  ]);

  return <CountdownContext.Provider value={value}>{children}</CountdownContext.Provider>;
}

export function useCountdown() {
  const context = useContext(CountdownContext);
  if (context === undefined) {
    throw new Error('useCountdown must be used within a CountdownProvider');
  }
  return context;
}
