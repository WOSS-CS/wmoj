'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface CountdownContextType {
  timeRemaining: number | null;
  contestName: string | null;
  isActive: boolean;
  contestId: string | null;
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
  const { user } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [contestName, setContestName] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [contestId, setContestId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Clear countdown when user changes (including logout)
  useEffect(() => {
    if (!user) {
      setContestId(null);
      setContestName(null);
      setTimeRemaining(null);
      setIsActive(false);
      setIsPaused(false);
      setTotalDuration(null);
      setProgressPercentage(0);
    }
  }, [user]);

  // Update progress percentage
  useEffect(() => {
    if (totalDuration && timeRemaining !== null) {
      const percentage = Math.max(0, ((totalDuration - timeRemaining) / totalDuration) * 100);
      setProgressPercentage(percentage);
    }
  }, [timeRemaining, totalDuration]);

  // Sync with server to get authoritative timer status
  const syncWithServer = useCallback(async () => {
    if (!user?.id || !contestId) return;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(`/api/contests/${contestId}/timer`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isActive && data.remainingSeconds > 0) {
          setTimeRemaining(data.remainingSeconds);
          setIsActive(true);
          if (data.contestName) {
            setContestName(data.contestName);
          }
        } else {
          // Timer expired or not active
          setIsActive(false);
          setTimeRemaining(null);
          // Only clear critical state if we are sure the timer is done/invalid
          // But here, if sync fails validation, we should probably reset/stop
          // setContestId(null); // Be careful clearing contestId here if it causes loops
          // Instead of clearing contestId immediately which might cause thrashing, 
          // we just update the timer status. activeContestId is authoritative from DB.
          // If the timer is effectively done, we can clear.
          if (isActive) { // Only if it WAS active
            setIsActive(false);
            setTimeRemaining(null);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  }, [user?.id, contestId, isActive]);

  const startCountdown = useCallback(async (id: string, name: string, durationMinutes: number) => {
    setContestId(id);
    setContestName(name);
    const durationSeconds = durationMinutes * 60;
    setTimeRemaining(durationSeconds);
    setTotalDuration(durationSeconds);
    setIsActive(true);
    setIsPaused(false);

    // Timer creation is now handled by the join API endpoint
    // Just sync with server to get the authoritative state
    setTimeout(() => syncWithServer(), 1000);
  }, [syncWithServer]);

  const stopCountdown = useCallback(async () => {
    setContestId(null);
    setContestName(null);
    setTimeRemaining(null);
    setIsActive(false);
    setIsPaused(false);
    setTotalDuration(null);
    setProgressPercentage(0);

    // Timer cleanup is now handled by the leave API endpoint
  }, []);

  const pauseCountdown = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeCountdown = useCallback(() => {
    setIsPaused(false);
  }, []);

  const checkExpiration = useCallback(async () => {
    if (!contestId || !user?.id) return;

    try {
      // Acquire a fresh access token
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(`/api/contests/${contestId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        }
      });

      if (res.ok) {
        stopCountdown();
        // Redirect to contests page
        window.location.href = '/contests';
      }
    } catch (error) {
      console.error('Error leaving contest:', error);
    }
  }, [contestId, user?.id, stopCountdown]);

  // Load countdown from server on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!user?.id) {
        setContestId(null);
        setContestName(null);
        setTimeRemaining(null);
        setIsActive(false);
        return;
      }

      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Find active contest for user
        const { data: participant, error } = await supabase
          .from('contest_participants')
          .select('contest_id')
          .eq('user_id', user.id)
          .limit(1);

        if (!isMounted) return;

        if (error || !participant || participant.length === 0) {
          return;
        }

        const activeContestId = participant[0].contest_id;

        // Only update if different to avoid potential re-renders
        setContestId(prev => (prev !== activeContestId ? activeContestId : prev));

        // Perform sync logic directly here to avoid dependency on syncWithServer
        // and to use the *just obtained* activeContestId
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          const response = await fetch(`/api/contests/${activeContestId}/timer`, {
            headers: {
              'Authorization': `Bearer ${session.session.access_token}`
            }
          });

          if (isMounted && response.ok) {
            const data = await response.json();
            if (data.isActive && data.remainingSeconds > 0) {
              setTimeRemaining(data.remainingSeconds);
              setIsActive(true);
              if (data.contestName) {
                setContestName(data.contestName);
              }
            }
          }
        }

      } catch (error) {
        console.error('Error loading active contest:', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Removed syncWithServer dependency

  // Update countdown every second (display only)
  useEffect(() => {
    if (!isActive || timeRemaining === null || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          setIsActive(false);
          checkExpiration();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeRemaining, isPaused, checkExpiration]);

  // Periodic sync with server to prevent drift (every 30 seconds)
  useEffect(() => {
    if (!isActive || !contestId) return;

    const syncInterval = setInterval(() => {
      syncWithServer();
    }, 30000); // 30 seconds

    return () => clearInterval(syncInterval);
  }, [isActive, contestId, syncWithServer]);

  const value = {
    timeRemaining,
    contestName,
    isActive,
    contestId,
    startCountdown,
    stopCountdown,
    pauseCountdown,
    resumeCountdown,
    isPaused,
    totalDuration,
    progressPercentage,
    syncWithServer,
  };

  return <CountdownContext.Provider value={value}>{children}</CountdownContext.Provider>;
}

export function useCountdown() {
  const context = useContext(CountdownContext);
  if (context === undefined) {
    throw new Error('useCountdown must be used within a CountdownProvider');
  }
  return context;
}
