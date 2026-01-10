import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface QualityGaugeProps {
  value: number; // 0-100
  status?: 'excellent' | 'good' | 'caution' | 'at-risk';
  size?: number;
  className?: string;
  animate?: boolean;
}

// Get health color based on value
function getHealthColor(health: number): string {
  if (health >= 90) return '#059669'; // success green - Excellent
  if (health >= 75) return '#2563eb'; // primary blue - Good
  if (health >= 50) return '#d97706'; // warning orange - Caution
  return '#ef4444'; // danger red - At Risk
}

export function QualityGauge({
  value,
  size = 100,
  className,
  animate = true,
}: QualityGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(animate ? 0 : value);
  
  const color = getHealthColor(value);
  
  // Circle calculations - THICKER stroke for bold appearance
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  
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
    <div 
      className={cn('relative', className)} 
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track - MORE VISIBLE */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
          className="dark:stroke-neutral-700"
        />
        
        {/* Value arc - THICK AND BOLD */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 4px ${color}40)`,
          }}
        />
      </svg>
      
      {/* Center content - BOLD AND CLEAR */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="font-bold leading-none tabular-nums"
          style={{ 
            fontSize: size * 0.28, 
            color: color 
          }}
        >
          {Math.round(animatedValue)}%
        </span>
        <span 
          className="font-medium text-muted-foreground"
          style={{ fontSize: size * 0.11 }}
        >
          Health
        </span>
      </div>
    </div>
  );
}

export default QualityGauge;
