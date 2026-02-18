'use client';

import { useCountdown } from '@/contexts/CountdownContext';

export function CountdownOverlay() {
  const { timeRemaining, isActive } = useCountdown();

  if (!isActive || timeRemaining === null) return null;

  const totalMinutes = Math.max(0, Math.floor(timeRemaining / 60));
  const seconds = Math.max(0, timeRemaining % 60);

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none text-foreground text-4xl font-bold">
      {totalMinutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
