'use client';

import { useState, useEffect, useCallback } from 'react';

export function useAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'entering' | 'entered' | 'exiting' | 'exited'>('idle');

  const triggerAnimation = useCallback((phase: 'enter' | 'exit') => {
    if (phase === 'enter') {
      setAnimationPhase('entering');
      setIsVisible(true);
      setTimeout(() => setAnimationPhase('entered'), 300);
    } else {
      setAnimationPhase('exiting');
      setTimeout(() => {
        setIsVisible(false);
        setAnimationPhase('exited');
      }, 300);
    }
  }, []);

  return {
    isVisible,
    animationPhase,
    triggerAnimation
  };
}

export function useStaggeredAnimation(items: unknown[], delay: number = 100) {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    items.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleItems(prev => [...prev, index]);
      }, index * delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [items, delay]);

  return visibleItems;
}

export function useScrollAnimation(threshold: number = 0.1) {
  const [isInView, setIsInView] = useState(false);
  const [elementRef, setElementRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!elementRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(elementRef);
    return () => observer.disconnect();
  }, [elementRef, threshold]);

  return { isInView, setElementRef };
}

export function useMousePosition() {
  // Global cursor tracking disabled
  return { x: 0, y: 0 };
}

export function useHoverAnimation() {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  return {
    isHovered,
    hoverPosition,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove
  };
}

export function usePulseAnimation(interval: number = 2000) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 500);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return isPulsing;
}

export function useBounceAnimation(trigger: boolean) {
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return isBouncing;
}

export function useShakeAnimation(trigger: boolean) {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return isShaking;
}

export function useGlowAnimation(intensity: 'low' | 'medium' | 'high' = 'medium') {
  const [isGlowing, setIsGlowing] = useState(false);

  const triggerGlow = useCallback(() => {
    setIsGlowing(true);
    const duration = intensity === 'low' ? 1000 : intensity === 'medium' ? 1500 : 2000;
    setTimeout(() => setIsGlowing(false), duration);
  }, [intensity]);

  return { isGlowing, triggerGlow };
}

export function useMorphingAnimation(shapes: string[], duration: number = 2000) {
  const [currentShape, setCurrentShape] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentShape(prev => (prev + 1) % shapes.length);
    }, duration);
    return () => clearInterval(interval);
  }, [shapes, duration]);

  return shapes[currentShape];
}

export function useParallaxAnimation(speed: number = 0.5) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return offset;
}

export function useRippleAnimation() {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const createRipple = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
  }, []);

  return { ripples, createRipple };
}

export function useTypewriterAnimation(text: string, speed: number = 100) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, text, speed]);

  const reset = useCallback(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, []);

  return { displayedText, isComplete, reset };
}
