'use client';

import { ReactNode, useEffect, useState } from 'react';

interface AnimationWrapperProps {
  children: ReactNode;
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideInTop' | 'slideInBottom' | 'bounceIn';
  delay?: number;
  duration?: number;
  trigger?: boolean;
  className?: string;
}

export function AnimationWrapper({
  children,
  animation = 'fadeInUp',
  delay = 0,
  duration = 600,
  trigger = true,
  className = ''
}: AnimationWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [trigger, delay]);

  const getAnimationClass = () => {
    if (!isVisible) return 'opacity-0';
    
    switch (animation) {
      case 'fadeInUp':
        return 'animate-fade-in-up';
      case 'fadeInDown':
        return 'animate-fade-in-down';
      case 'fadeInLeft':
        return 'animate-fade-in-left';
      case 'fadeInRight':
        return 'animate-fade-in-right';
      case 'scaleIn':
        return 'animate-scale-in';
      case 'slideInTop':
        return 'animate-slide-in-top';
      case 'slideInBottom':
        return 'animate-slide-in-bottom';
      case 'bounceIn':
        return 'animate-bounce-in';
      default:
        return 'animate-fade-in-up';
    }
  };

  return (
    <div 
      className={`transition-all duration-${duration} ${getAnimationClass()} ${className}`}
      style={{ 
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}

interface StaggeredAnimationProps {
  children: ReactNode[];
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn';
  staggerDelay?: number;
  className?: string;
}

export function StaggeredAnimation({
  children,
  animation = 'fadeInUp',
  staggerDelay = 100,
  className = ''
}: StaggeredAnimationProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <AnimationWrapper
          key={index}
          animation={animation}
          delay={index * staggerDelay}
          className="w-full"
        >
          {child}
        </AnimationWrapper>
      ))}
    </div>
  );
}

interface HoverAnimationProps {
  children: ReactNode;
  effect?: 'lift' | 'scale' | 'glow' | 'rotate' | 'bounce' | 'wiggle';
  className?: string;
}

export function HoverAnimation({
  children,
  effect = 'lift',
  className = ''
}: HoverAnimationProps) {
  const getEffectClass = () => {
    switch (effect) {
      case 'lift':
        return 'hover-lift';
      case 'scale':
        return 'hover-scale';
      case 'glow':
        return 'hover-glow';
      case 'rotate':
        return 'hover-rotate';
      case 'bounce':
        return 'hover-bounce';
      case 'wiggle':
        return 'hover-wiggle';
      default:
        return 'hover-lift';
    }
  };

  return (
    <div className={`${getEffectClass()} smooth-transition ${className}`}>
      {children}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = 'green',
  className = ''
}: LoadingSpinnerProps) {
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-8 h-8';
      case 'lg':
        return 'w-12 h-12';
      case 'xl':
        return 'w-16 h-16';
      default:
        return 'w-8 h-8';
    }
  };

  const getColorClass = () => {
    switch (color) {
      case 'green':
        return 'border-green-400';
      case 'blue':
        return 'border-blue-400';
      case 'red':
        return 'border-red-400';
      case 'yellow':
        return 'border-yellow-400';
      case 'purple':
        return 'border-purple-400';
      default:
        return 'border-green-400';
    }
  };

  return (
    <div className={`${getSizeClass()} ${className}`}>
      <div className={`${getSizeClass()} border-4 border-t-transparent rounded-full animate-spin ${getColorClass()}`}></div>
    </div>
  );
}

interface PulseEffectProps {
  children: ReactNode;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function PulseEffect({
  children,
  intensity = 'medium',
  className = ''
}: PulseEffectProps) {
  const getIntensityClass = () => {
    switch (intensity) {
      case 'low':
        return 'animate-pulse';
      case 'medium':
        return 'animate-pulse-glow';
      case 'high':
        return 'animate-glow';
      default:
        return 'animate-pulse';
    }
  };

  return (
    <div className={`${getIntensityClass()} ${className}`}>
      {children}
    </div>
  );
}

interface ShimmerEffectProps {
  children: ReactNode;
  className?: string;
}

export function ShimmerEffect({
  children,
  className = ''
}: ShimmerEffectProps) {
  return (
    <div className={`animate-shimmer ${className}`}>
      {children}
    </div>
  );
}
