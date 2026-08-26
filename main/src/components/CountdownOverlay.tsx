'use client';

import { useCountdown } from '@/contexts/CountdownContext';

export function CountdownOverlay() {
  const { timeRemaining, isActive } = useCountdown();

  if (!isActive || timeRemaining === null) return null;

  const totalMinutes = Math.max(0, Math.floor(timeRemaining / 60));
  const seconds = Math.max(0, timeRemaining % 60);
  const isLow = timeRemaining <= 60;
  const label = `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'} ${seconds} second${seconds === 1 ? '' : 's'} remaining in this contest`;

  return (
    // Pinned bottom-left: ToastContainer owns bottom-6 right-6, and the two
    // used to sit on top of each other. role="timer" is a live region whose
    // implicit aria-live is "off", which is what a per-second countdown wants —
    // the label carries the value for anyone who queries it, without announcing
    // a new time every single second.
    <div
      role="timer"
      aria-label={label}
      className={`fixed bottom-4 left-4 z-50 select-none font-mono text-sm px-3 py-1.5 rounded-lg border ${isLow ? 'bg-error/10 border-error/30 text-error' : 'bg-surface-1 border-border text-text-muted'
        }`}
    >
      <span aria-hidden="true">
        {totalMinutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
