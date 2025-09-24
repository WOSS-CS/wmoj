'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface CountdownContextType {
  timeRemaining: number | null;
  contestName: string | null;
  isActive: boolean;
  startCountdown: (contestId: string, contestName: string, durationMinutes: number) => void;
  stopCountdown: () => void;
}

const CountdownContext = createContext<CountdownContextType | undefined>(undefined);

export function CountdownProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [contestName, setContestName] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [contestId, setContestId] = useState<string | null>(null);

  const startCountdown = useCallback(async (id: string, name: string, durationMinutes: number) => {
    setContestId(id);
    setContestName(name);
    setTimeRemaining(durationMinutes * 60);
    setIsActive(true);
    
    // Store in database for persistence
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
      console.error('Error saving countdown to database:', error);
    }
  }, [user]);

  const stopCountdown = useCallback(async () => {
    setContestId(null);
    setContestName(null);
    setTimeRemaining(null);
    setIsActive(false);
    
    // Remove from database
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
      console.error('Error removing countdown from database:', error);
    }
  }, [user, contestId]);

  const checkExpiration = useCallback(async () => {
    if (!contestId || !user) return;
    
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
  }, [contestId, user, stopCountdown]);

  // Load countdown from database on mount
  useEffect(() => {
    (async () => {
      if (!user) return;
      
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
        
        if (error || !timer) return;
        
        const startTime = new Date(timer.started_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, (timer.duration_minutes * 60) - elapsed);
        
        if (remaining > 0) {
          setContestId(timer.contest_id);
          setContestName(timer.contest_id); // We'll need to fetch the name separately
          setTimeRemaining(remaining);
          setIsActive(true);
        } else {
          // Countdown expired, clean up
          await supabase.from('countdown_timers').delete()
            .eq('user_id', user.id)
            .eq('contest_id', timer.contest_id);
        }
      } catch (error) {
        console.error('Error loading countdown from database:', error);
      }
    })();
  }, [user]);

  // Update countdown every second
  useEffect(() => {
    if (!isActive || timeRemaining === null) return;

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
  }, [isActive, timeRemaining, checkExpiration]);

  const value = {
    timeRemaining,
    contestName,
    isActive,
    startCountdown,
    stopCountdown,
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
