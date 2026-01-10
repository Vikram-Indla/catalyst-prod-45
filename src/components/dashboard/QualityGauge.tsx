import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface QualityGaugeProps {
  value: number; // 0-100
  status: 'excellent' | 'good' | 'caution' | 'at-risk';
  size?: number;
  className?: string;
  animate?: boolean;
}

// Get health color based on value - FIX 4
function getHealthColor(health: number): { stroke: string; text: string } {
  if (health >= 90) return { stroke: '#059669', text: 'text-emerald-600 dark:text-emerald-400' }; // success green - Excellent
  if (health >= 75) return { stroke: '#2563eb', text: 'text-blue-600 dark:text-blue-400' }; // primary blue - Good
  if (health >= 50) return { stroke: '#d97706', text: 'text-amber-600 dark:text-amber-400' }; // warning orange - Caution
  return { stroke: '#ef4444', text: 'text-red-600 dark:text-red-400' }; // danger red - At Risk
}

export function QualityGauge({
  value,
  status,
  size = 120,
  className,
  animate = true,
}: QualityGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(animate ? 0 : value);
  
  // Use value-based color instead of status-based - FIX 4
  const colors = getHealthColor(value);
  
  // Circle calculations
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = animatedValue / 100;
  const strokeDashoffset = circumference * (1 - progress);
  
  // Animate on mount
  useEffect(() => {
    if (!animate) return;
    
    const duration = 1200;
    const startTime = Date.now();
    const startValue = 0;
    
    const animateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (value - startValue) * easeOut;
      
      setAnimatedValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animateValue);
      }
    };
    
    requestAnimationFrame(animateValue);
  }, [value, animate]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border-default))"
          strokeWidth={strokeWidth}
          className="dark:opacity-50"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-100"
          style={{
            filter: `drop-shadow(0 0 6px ${colors.stroke})`,
          }}
        />
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold tabular-nums', colors.text)}>
          {Math.round(animatedValue)}%
        </span>
        {/* FIX 11: Change "HEALTH" to "Health" (sentence case) */}
        <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
          Health
        </span>
      </div>
    </div>
  );
}

export default QualityGauge;
