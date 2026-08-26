import React, { useState, useEffect } from 'react';
import { TickerNumber } from '../components/TickerNumber';
import { formatSmartNumber, formatSmartCurrency } from './numberFormatting';

export { TickerNumber };
export { formatSmartNumber, formatSmartCurrency };

// Progress bar color based on metric quality percentage (0 - 100%)
export function getProgressBarColor(pct: number): {
  hex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  if (pct >= 80) {
    return {
      hex: '#22C55E',
      bgClass: 'bg-[#22C55E]',
      borderClass: 'border-[#22C55E]/40',
      textClass: 'text-[#22C55E]',
    };
  } else if (pct >= 60) {
    return {
      hex: '#10B981',
      bgClass: 'bg-[#10B981]',
      borderClass: 'border-[#10B981]/40',
      textClass: 'text-[#10B981]',
    };
  } else if (pct >= 40) {
    return {
      hex: '#F59E0B',
      bgClass: 'bg-[#F59E0B]',
      borderClass: 'border-[#F59E0B]/40',
      textClass: 'text-[#F59E0B]',
    };
  } else if (pct >= 20) {
    return {
      hex: '#F97316',
      bgClass: 'bg-[#F97316]',
      borderClass: 'border-[#F97316]/40',
      textClass: 'text-[#F97316]',
    };
  } else {
    return {
      hex: '#EF4444',
      bgClass: 'bg-[#EF4444]',
      borderClass: 'border-[#EF4444]/40',
      textClass: 'text-[#EF4444]',
    };
  }
}

// Trust Score badge style based on score (0 - 100)
export function getTrustScoreBadgeStyle(score: number): {
  bgClass: string;
  borderClass: string;
  textClass: string;
  label: string;
} {
  if (score >= 90) {
    return {
      bgClass: 'bg-[#22C55E]/15',
      borderClass: 'border-[#22C55E]/40',
      textClass: 'text-[#22C55E]',
      label: 'EXCELLENT',
    };
  } else if (score >= 70) {
    return {
      bgClass: 'bg-blue-500/15',
      borderClass: 'border-blue-500/40',
      textClass: 'text-blue-400',
      label: 'GOOD',
    };
  } else if (score >= 50) {
    return {
      bgClass: 'bg-amber-500/15',
      borderClass: 'border-amber-500/40',
      textClass: 'text-amber-400',
      label: 'FAIR',
    };
  } else if (score >= 30) {
    return {
      bgClass: 'bg-orange-500/15',
      borderClass: 'border-orange-500/40',
      textClass: 'text-orange-400',
      label: 'WEAK',
    };
  } else {
    return {
      bgClass: 'bg-rose-500/15',
      borderClass: 'border-rose-500/40',
      textClass: 'text-rose-400',
      label: 'POOR',
    };
  }
}

// Custom Hook for smooth animated counting numbers
export function useAnimatedNumber(
  targetValue: number,
  durationMs: number = 1000,
  enabled: boolean = true
): number {
  const [currentValue, setCurrentValue] = useState<number>(enabled ? 0 : targetValue);

  useEffect(() => {
    if (!enabled) {
      setCurrentValue(targetValue);
      return;
    }

    let startTimestamp: number | null = null;
    const startVal = 0;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      
      // easeOutCubic easing formula
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextVal = startVal + (targetValue - startVal) * easedProgress;

      setCurrentValue(nextVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrentValue(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, durationMs, enabled]);

  return currentValue;
}

// React Component for Animated Number / Ticker display
interface AnimatedNumberProps {
  value: number | string;
  durationMs?: number;
  format?: (num: number) => string;
  className?: string;
  animate?: boolean;
  prefix?: string;
  suffix?: string;
  useTicker?: boolean;
  refreshTrigger?: any;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  durationMs = 700,
  format,
  className = '',
  animate = true,
  prefix = '',
  suffix = '',
  useTicker = true,
  refreshTrigger,
}) => {
  const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;
  
  if (useTicker) {
    const formattedStr = format ? format(numVal) : (typeof value === 'string' ? value : formatSmartNumber(numVal));
    return (
      <TickerNumber
        value={formattedStr}
        prefix={prefix}
        suffix={suffix}
        className={className}
        durationMs={durationMs}
        refreshTrigger={refreshTrigger}
      />
    );
  }

  const animatedVal = useAnimatedNumber(numVal, durationMs, animate);
  const displayStr = format ? format(animatedVal) : formatSmartNumber(animatedVal);

  return <span className={className}>{prefix}{displayStr}{suffix}</span>;
};
