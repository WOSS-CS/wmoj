'use client';

import { useCountdown } from '@/contexts/CountdownContext';
import { useState, useEffect, useRef } from 'react';
import { AnimationWrapper, HoverAnimation } from './AnimationWrapper';
import { RippleEffect, MagneticEffect, TiltEffect } from './MicroInteractions';
import { useHoverAnimation } from '@/hooks/useAnimations';

export function CountdownOverlay() {
  const { 
    timeRemaining, 
    contestName, 
    isActive, 
    isPaused, 
    progressPercentage: contextProgress,
    pauseCountdown,
    resumeCountdown,
    stopCountdown
  } = useCountdown();
  const [isVisible, setIsVisible] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(100);
  const [timeSegments, setTimeSegments] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const { isHovered, handleMouseEnter, handleMouseLeave } = useHoverAnimation();

  useEffect(() => {
    if (isActive && timeRemaining !== null) {
      setIsVisible(true);
    } else {
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }
  }, [isActive, timeRemaining]);

  useEffect(() => {
    if (timeRemaining !== null) {
      // Update time segments
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      const seconds = timeRemaining % 60;
      setTimeSegments({ hours, minutes, seconds });

      // Update progress percentage from context
      setProgressPercentage(contextProgress);

      // Update urgency states
      const urgent = timeRemaining <= 300; // 5 minutes
      const critical = timeRemaining <= 60; // 1 minute
      setIsUrgent(urgent);
      setIsCritical(critical);

      // Show warning for last 10 seconds
      setShowWarning(timeRemaining <= 10);

      // Update pulse intensity
      if (critical) {
        setPulseIntensity(4);
      } else if (urgent) {
        setPulseIntensity(2);
      } else {
        setPulseIntensity(1);
      }
    }
  }, [timeRemaining, contextProgress]);

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

  const getBackgroundGradient = (seconds: number) => {
    if (seconds <= 60) return 'from-red-900/20 to-red-800/10';
    if (seconds <= 300) return 'from-yellow-900/20 to-yellow-800/10';
    return 'from-green-900/20 to-green-800/10';
  };

  const getStatusIcon = (seconds: number) => {
    if (seconds <= 60) return '🔥';
    if (seconds <= 300) return '⚠️';
    return '⏱️';
  };

  const getStatusText = (seconds: number) => {
    if (seconds <= 60) return 'CRITICAL';
    if (seconds <= 300) return 'URGENT';
    return 'ACTIVE';
  };

  return (
    <AnimationWrapper 
      animation="slideInBottom" 
      delay={0}
      trigger={isVisible}
    >
      <div className="fixed bottom-4 left-4 z-50">
        <TiltEffect maxTilt={3}>
          <MagneticEffect strength={0.2}>
            <RippleEffect color={isCritical ? 'red' : isUrgent ? 'yellow' : 'green'}>
              <HoverAnimation effect="lift">
                <div 
                  ref={overlayRef}
                  className={`relative bg-gradient-to-br ${getBackgroundGradient(timeRemaining)} backdrop-blur-2xl rounded-2xl p-6 border shadow-2xl smooth-transition ${
                    getBorderColor(timeRemaining)
                  } ${getGlowColor(timeRemaining)} ${
                    isCritical ? 'animate-pulse-glow' : isUrgent ? 'animate-glow' : ''
                  } ${
                    isHovered ? 'scale-105 shadow-3xl' : ''
                  }`}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    boxShadow: isCritical 
                      ? '0 0 30px rgba(248, 113, 113, 0.8), 0 0 60px rgba(248, 113, 113, 0.4)' 
                      : isUrgent 
                      ? '0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.3)'
                      : '0 0 15px rgba(34, 197, 94, 0.4), 0 0 30px rgba(34, 197, 94, 0.2)'
                  }}
                >
                  {/* Animated Background Pattern */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className={`absolute inset-0 opacity-10 ${
                      isCritical ? 'animate-ping' : isUrgent ? 'animate-pulse' : ''
                    }`}>
                      <div className="absolute top-2 left-2 w-1 h-1 bg-current rounded-full"></div>
                      <div className="absolute top-2 right-2 w-1 h-1 bg-current rounded-full"></div>
                      <div className="absolute bottom-2 left-2 w-1 h-1 bg-current rounded-full"></div>
                      <div className="absolute bottom-2 right-2 w-1 h-1 bg-current rounded-full"></div>
                    </div>
                  </div>

                  {/* Header with Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                          isCritical ? 'bg-red-500 animate-pulse' : 
                          isUrgent ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                        }`} style={{ 
                          animationDuration: `${0.5 / pulseIntensity}s`,
                        }}>
                          {getStatusIcon(timeRemaining)}
                        </div>
                        {isCritical && (
                          <div className="absolute inset-0 w-6 h-6 rounded-full bg-red-400 animate-ping opacity-75"></div>
                        )}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {contestName}
                        </div>
                        <div className={`text-xs font-bold ${
                          isCritical ? 'text-red-400' : 
                          isUrgent ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {getStatusText(timeRemaining)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Ring */}
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-700"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={`transition-all duration-1000 ${
                            isCritical ? 'text-red-400' : 
                            isUrgent ? 'text-yellow-400' : 'text-green-400'
                          }`}
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          fill="none"
                          strokeDasharray={`${progressPercentage}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${
                          isCritical ? 'bg-red-400' : 
                          isUrgent ? 'bg-yellow-400' : 'bg-green-400'
                        }`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Main Time Display */}
                  <div className="text-center mb-4">
                    <div className={`text-4xl font-bold transition-all duration-300 ${
                      getTimeColor(timeRemaining)
                    } ${isCritical ? 'animate-bounce' : isUrgent ? 'animate-pulse' : ''}`}>
                      {formatTime(timeRemaining)}
                    </div>
                    
                    {/* Time Segments */}
                    <div className="flex justify-center space-x-4 mt-2">
                      {timeSegments.hours > 0 && (
                        <div className="text-center">
                          <div className="text-xs text-gray-400">HOURS</div>
                          <div className="text-lg font-semibold text-white">{timeSegments.hours}</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-xs text-gray-400">MINUTES</div>
                        <div className="text-lg font-semibold text-white">{timeSegments.minutes}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400">SECONDS</div>
                        <div className={`text-lg font-semibold ${
                          isCritical ? 'text-red-400 animate-pulse' : 'text-white'
                        }`}>
                          {timeSegments.seconds}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          isCritical ? 'bg-gradient-to-r from-red-500 to-red-400' :
                          isUrgent ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                          'bg-gradient-to-r from-green-500 to-green-400'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Pause/Resume Controls */}
                  <div className="flex justify-center space-x-2 mb-4">
                    <button
                      onClick={isPaused ? resumeCountdown : pauseCountdown}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        isPaused 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      } hover-scale`}
                    >
                      {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                    </button>
                    <button
                      onClick={stopCountdown}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all duration-300 hover-scale"
                    >
                      🛑 Stop
                    </button>
                  </div>

                  {/* Paused State Indicator */}
                  {isPaused && (
                    <div className="text-center mb-2">
                      <div className="text-yellow-400 text-sm font-bold animate-pulse">
                        ⏸️ COUNTDOWN PAUSED
                      </div>
                    </div>
                  )}

                  {/* Warning Messages */}
                  {showWarning && (
                    <div className="text-center">
                      <div className="text-red-400 text-sm font-bold animate-bounce">
                        🚨 FINAL COUNTDOWN! 🚨
                      </div>
                    </div>
                  )}
                  
                  {isCritical && !showWarning && !isPaused && (
                    <div className="text-center">
                      <div className="text-red-400 text-sm font-medium animate-pulse">
                        ⚠️ Less than 1 minute remaining!
                      </div>
                    </div>
                  )}
                  
                  {isUrgent && !isCritical && !isPaused && (
                    <div className="text-center">
                      <div className="text-yellow-400 text-sm font-medium animate-pulse">
                        ⚠️ Time is running out!
                      </div>
                    </div>
                  )}

                  {/* Floating Particles */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                    <div className={`absolute top-2 left-2 w-1 h-1 bg-current rounded-full animate-ping ${
                      isCritical ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-green-400'
                    }`} style={{ animationDelay: '0s' }}></div>
                    <div className={`absolute top-2 right-2 w-1 h-1 bg-current rounded-full animate-ping ${
                      isCritical ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-green-400'
                    }`} style={{ animationDelay: '0.5s' }}></div>
                    <div className={`absolute bottom-2 left-2 w-1 h-1 bg-current rounded-full animate-ping ${
                      isCritical ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-green-400'
                    }`} style={{ animationDelay: '1s' }}></div>
                    <div className={`absolute bottom-2 right-2 w-1 h-1 bg-current rounded-full animate-ping ${
                      isCritical ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-green-400'
                    }`} style={{ animationDelay: '1.5s' }}></div>
                  </div>
                </div>
              </HoverAnimation>
            </RippleEffect>
          </MagneticEffect>
        </TiltEffect>
      </div>
    </AnimationWrapper>
  );
}
