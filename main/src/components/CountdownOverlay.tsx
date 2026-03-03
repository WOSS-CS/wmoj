'use client';

import { useCountdown } from '@/contexts/CountdownContext';

export function CountdownOverlay() {
  const { timeRemaining, isActive } = useCountdown();

  if (!isActive || timeRemaining === null) return null;

  const totalMinutes = Math.max(0, Math.floor(timeRemaining / 60));
  const seconds = Math.max(0, timeRemaining % 60);
  const isLow = timeRemaining <= 60;

  return (
    <div className={`fixed bottom-4 right-4 z-50 select-none font-mono text-sm px-3 py-1.5 rounded-lg border ${isLow ? 'bg-error/10 border-error/30 text-error' : 'bg-surface-1 border-border text-text-muted'
      }`}>
      {totalMinutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
