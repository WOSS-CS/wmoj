'use client';

import { ReactNode, useState, useEffect } from 'react';

interface RippleEffectProps {
  children: ReactNode;
  className?: string;
  color?: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
}

export function RippleEffect({ children, className = '', color = 'green' }: RippleEffectProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const getColorClass = () => {
    switch (color) {
      case 'green':
        return 'bg-green-400/30';
      case 'blue':
        return 'bg-blue-400/30';
      case 'red':
        return 'bg-red-400/30';
      case 'yellow':
        return 'bg-yellow-400/30';
      case 'purple':
        return 'bg-purple-400/30';
      default:
        return 'bg-green-400/30';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = {
      id: Date.now(),
      x,
      y
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  };

  return (
    <div 
      className={`relative overflow-hidden cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {children}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className={`absolute rounded-full pointer-events-none animate-ping ${getColorClass()}`}
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
}

interface MagneticEffectProps { children: ReactNode; strength?: number; maxOffset?: number; className?: string }
// Neutralized MagneticEffect: retains API but no longer applies motion.
export function MagneticEffect({ children, className = '' }: MagneticEffectProps) {
  return <div className={className}>{children}</div>;
}

interface TiltEffectProps { children: ReactNode; className?: string; maxTilt?: number }
// Neutralized TiltEffect: kept API shape so existing usages need no edits.
export function TiltEffect({ children, className = '' }: TiltEffectProps) {
  return <div className={className}>{children}</div>;
}

interface ParallaxEffectProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function ParallaxEffect({ children, speed = 0.5, className = '' }: ParallaxEffectProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{
        transform: `translateY(${offset}px)`
      }}
    >
      {children}
    </div>
  );
}

interface TypewriterEffectProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterEffect({ 
  text, 
  speed = 100, 
  className = '', 
  onComplete 
}: TypewriterEffectProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

interface FloatingElementProps {
  children: ReactNode;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function FloatingElement({ 
  children, 
  intensity = 'medium', 
  className = '' 
}: FloatingElementProps) {
  const getIntensityClass = () => {
    switch (intensity) {
      case 'low':
        return 'animate-float';
      case 'medium':
        return 'animate-float';
      case 'high':
        return 'animate-float';
      default:
        return 'animate-float';
    }
  };

  return (
    <div className={`${getIntensityClass()} ${className}`}>
      {children}
    </div>
  );
}

interface GlowEffectProps {
  children: ReactNode;
  color?: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function GlowEffect({ 
  children, 
  color = 'green', 
  intensity = 'medium', 
  className = '' 
}: GlowEffectProps) {
  const getColorClass = () => {
    switch (color) {
      case 'green':
        return 'shadow-green-400/50';
      case 'blue':
        return 'shadow-blue-400/50';
      case 'red':
        return 'shadow-red-400/50';
      case 'yellow':
        return 'shadow-yellow-400/50';
      case 'purple':
        return 'shadow-purple-400/50';
      default:
        return 'shadow-green-400/50';
    }
  };

  const getIntensityClass = () => {
    switch (intensity) {
      case 'low':
        return 'shadow-lg';
      case 'medium':
        return 'shadow-xl';
      case 'high':
        return 'shadow-2xl';
      default:
        return 'shadow-xl';
    }
  };

  return (
    <div className={`${getIntensityClass()} ${getColorClass()} ${className}`}>
      {children}
    </div>
  );
}

interface MorphingShapeProps {
  children: ReactNode;
  shapes?: string[];
  duration?: number;
  className?: string;
}

export function MorphingShape({ 
  children, 
  shapes = ['rounded-lg', 'rounded-full', 'rounded-none'],
  duration = 2000,
  className = '' 
}: MorphingShapeProps) {
  const [currentShape, setCurrentShape] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentShape(prev => (prev + 1) % shapes.length);
    }, duration);
    return () => clearInterval(interval);
  }, [shapes.length, duration]);

  return (
    <div 
      className={`transition-all duration-1000 ease-in-out ${shapes[currentShape]} ${className}`}
    >
      {children}
    </div>
  );
}
