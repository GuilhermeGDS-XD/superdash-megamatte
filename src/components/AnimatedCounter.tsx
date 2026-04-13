'use client';

import { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
}

export function AnimatedCounter({ value, duration = 1000, formatter }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frameId: number;
    let startTime: number | null = null;
    const startValue = 0;
    const endValue = value;

    if (endValue === 0) {
      setCount(0);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Funçao de easing para suavizar o final (EaseOutQuad)
      const easeProgress = progress * (2 - progress);
      
      const currentCount = easeProgress * (endValue - startValue) + startValue;
      setCount(currentCount);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      } else {
        setCount(endValue); // Garante o valor exato no final
      }
    };

    frameId = window.requestAnimationFrame(step);
    
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [value, duration]);

  return <span>{formatter ? formatter(count) : Math.floor(count)}</span>;
}
