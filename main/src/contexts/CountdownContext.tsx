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

  const startCountdown = useCallback((id: string, name: string, durationMinutes: number) => {
    const endTime = Date.now() + (durationMinutes * 60 * 1000);
    setContestId(id);
    setContestName(name);
    setTimeRemaining(durationMinutes * 60);
    setIsActive(true);
    
    // Store in localStorage for persistence
    localStorage.setItem('contestCountdown', JSON.stringify({
      contestId: id,
      contestName: name,
      endTime,
      durationMinutes
    }));
  }, []);

  const stopCountdown = useCallback(() => {
    setContestId(null);
    setContestName(null);
    setTimeRemaining(null);
    setIsActive(false);
    localStorage.removeItem('contestCountdown');
  }, []);

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

  // Load countdown from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('contestCountdown');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((data.endTime - now) / 1000));
        
        if (remaining > 0) {
          setContestId(data.contestId);
          setContestName(data.contestName);
          setTimeRemaining(remaining);
          setIsActive(true);
        } else {
          // Countdown expired, clean up
          localStorage.removeItem('contestCountdown');
        }
      } catch (error) {
        console.error('Error loading countdown from localStorage:', error);
        localStorage.removeItem('contestCountdown');
      }
    }
  }, []);

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
