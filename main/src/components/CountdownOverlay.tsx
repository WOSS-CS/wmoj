'use client';

import { useCountdown } from '@/contexts/CountdownContext';
import { useState, useEffect } from 'react';

export function CountdownOverlay() {
  const { timeRemaining, contestName, isActive } = useCountdown();
  const [isVisible, setIsVisible] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1);

  useEffect(() => {
    if (isActive && timeRemaining !== null) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isActive, timeRemaining]);

  useEffect(() => {
    if (timeRemaining !== null) {
      if (timeRemaining <= 60) {
        setPulseIntensity(3);
      } else if (timeRemaining <= 300) {
        setPulseIntensity(2);
      } else {
        setPulseIntensity(1);
      }
    }
  }, [timeRemaining]);

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

  const getGlowColor = (seconds: number) => {
    if (seconds <= 60) return 'shadow-red-400/50';
    if (seconds <= 300) return 'shadow-yellow-400/50';
    return 'shadow-green-400/50';
  };

  const getBorderColor = (seconds: number) => {
    if (seconds <= 60) return 'border-red-400/50';
    if (seconds <= 300) return 'border-yellow-400/50';
    return 'border-green-400/50';
  };

  return (
    <div className={`fixed bottom-4 left-4 z-50 transition-all duration-500 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className={`bg-black/90 backdrop-blur-xl rounded-xl p-4 border shadow-2xl hover-lift smooth-transition ${
        getBorderColor(timeRemaining)
      } ${getGlowColor(timeRemaining)}`}>
        <div className="flex items-center space-x-4">
          {/* Enhanced Status Indicator */}
          <div className="relative">
            <div className={`w-4 h-4 rounded-full animate-pulse ${
              timeRemaining <= 60 ? 'bg-red-400' : 
              timeRemaining <= 300 ? 'bg-yellow-400' : 'bg-green-400'
            }`} style={{ 
              animationDuration: `${0.5 / pulseIntensity}s`,
              boxShadow: timeRemaining <= 60 ? '0 0 10px rgba(248, 113, 113, 0.6)' : 
                        timeRemaining <= 300 ? '0 0 10px rgba(251, 191, 36, 0.6)' : 
                        '0 0 10px rgba(34, 197, 94, 0.6)'
            }}></div>
            {timeRemaining <= 60 && (
              <div className="absolute inset-0 w-4 h-4 rounded-full bg-red-400 animate-ping opacity-75"></div>
            )}
          </div>
          
          {/* Contest Info */}
          <div className="flex-1">
            <div className="text-white text-sm font-medium mb-1 animate-fade-in-up">
              {contestName}
            </div>
            <div className={`text-xl font-bold transition-all duration-300 ${getTimeColor(timeRemaining)} animate-scale-in`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
          
          {/* Progress Ring */}
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-700"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`transition-all duration-1000 ${
                  timeRemaining <= 60 ? 'text-red-400' : 
                  timeRemaining <= 300 ? 'text-yellow-400' : 'text-green-400'
                }`}
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${(timeRemaining / 3600) * 100}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                timeRemaining <= 60 ? 'bg-red-400' : 
                timeRemaining <= 300 ? 'bg-yellow-400' : 'bg-green-400'
              }`}></div>
            </div>
          </div>
        </div>
        
        {/* Warning Message for Low Time */}
        {timeRemaining <= 60 && (
          <div className="mt-3 text-center">
            <div className="text-red-400 text-xs font-medium animate-pulse">
              ⚠️ Time Running Out!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
