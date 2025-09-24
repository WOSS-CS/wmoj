'use client';

import { useCountdown } from '@/contexts/CountdownContext';

export function CountdownOverlay() {
  const { timeRemaining, contestName, isActive } = useCountdown();

  if (!isActive || timeRemaining === null) return null;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (seconds: number) => {
    if (seconds <= 60) return 'text-red-400';
    if (seconds <= 300) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-black/80 backdrop-blur-lg rounded-lg p-4 border border-green-400/50 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <div>
            <div className="text-white text-sm font-medium">{contestName}</div>
            <div className={`text-lg font-bold ${getTimeColor(timeRemaining)}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
