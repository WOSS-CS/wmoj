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

  const startCountdown = useCallback(async (id: string, name: string, durationMinutes: number) => {
    setContestId(id);
    setContestName(name);
    const durationSeconds = durationMinutes * 60;
    setTimeRemaining(durationSeconds);
    setTotalDuration(durationSeconds);
    setIsActive(true);
    setIsPaused(false);
    
    // Store in database for persistence (if table exists)
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      await supabase.from('countdown_timers').upsert({
        user_id: user?.id,
        contest_id: id,
        started_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        is_active: true
      });
    } catch (error) {
      // If table doesn't exist, just log a warning and continue
      console.warn('Countdown timer table not available, countdown will not persist:', error);
    }
  }, [user?.id]);

  const stopCountdown = useCallback(async () => {
    setContestId(null);
    setContestName(null);
    setTimeRemaining(null);
    setIsActive(false);
    setIsPaused(false);
    setTotalDuration(null);
    setProgressPercentage(0);
    
    // Remove from database (if table exists)
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      if (user?.id && contestId) {
        await supabase.from('countdown_timers').delete()
          .eq('user_id', user.id)
          .eq('contest_id', contestId);
      }
    } catch (error) {
      // If table doesn't exist, just log a warning and continue
      console.warn('Countdown timer table not available:', error);
    }
  }, [user?.id, contestId]);

  const pauseCountdown = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeCountdown = useCallback(() => {
    setIsPaused(false);
  }, []);

  const checkExpiration = useCallback(async () => {
    if (!contestId || !user?.id) return;
    
    try {
      const res = await fetch(`/api/contests/${contestId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await import('@supabase/supabase-js')).createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          ).auth.getSession().then(s => s.data.session?.access_token)}`
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

  // Load countdown from database on mount
  useEffect(() => {
    (async () => {
      if (!user?.id) {
        // Clear countdown if user is not authenticated
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
        
        const { data: timer, error } = await supabase
          .from('countdown_timers')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (error) {
          // If table doesn't exist or other error, just return without setting countdown
          console.warn('Countdown timer table not available:', error.message);
          return;
        }
        
        if (!timer) return;
        
        const startTime = new Date(timer.started_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, (timer.duration_minutes * 60) - elapsed);
        
        if (remaining > 0) {
          setContestId(timer.contest_id);
          setTimeRemaining(remaining);
          setIsActive(true);
          
          // Fetch contest name
          try {
            const { data: contest, error: contestErr } = await supabase
              .from('contests')
              .select('name')
              .eq('id', timer.contest_id)
              .single();
            
            if (!contestErr && contest) {
              setContestName(contest.name);
            } else {
              setContestName(timer.contest_id); // Fallback to ID
            }
          } catch (error) {
            console.error('Error fetching contest name:', error);
            setContestName(timer.contest_id); // Fallback to ID
          }
        } else {
          // Countdown expired, clean up (if table exists)
          try {
            await supabase.from('countdown_timers').delete()
              .eq('user_id', user.id)
              .eq('contest_id', timer.contest_id);
          } catch (cleanupError) {
            console.warn('Error cleaning up expired countdown:', cleanupError);
          }
        }
      } catch (error) {
        console.error('Error loading countdown from database:', error);
      }
    })();
  }, [user?.id]);

  // Update countdown every second
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
