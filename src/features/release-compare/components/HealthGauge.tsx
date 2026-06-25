/**
 * Health Gauge Component
 * Circular gauge showing health score with trend
 */

import React from 'react';
// No @atlaskit/icon equivalent — inline SVG
const TrendingUpIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
  </svg>
);
const TrendingDownIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
  </svg>
);
const MinusIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
import { CompareHealthLevel } from '../types';
import { getHealthColor, getHealthLabel } from '../utils/compareUtils';

interface HealthGaugeProps {
  score: number;
  level: CompareHealthLevel;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  isWinner?: boolean;
}

export function HealthGauge({ score, level, trend, isWinner }: HealthGaugeProps) {
  const color = getHealthColor(level);
  const label = getHealthLabel(level);
  
  // SVG circle calculations
  const size = 56;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;
  
  const TrendIcon = trend?.direction === 'up'
    ? TrendingUpIcon
    : trend?.direction === 'down'
    ? TrendingDownIcon
    : MinusIcon;
    
  return (
    <div className="flex items-center gap-3 relative">
      {/* Winner star */}
      {isWinner && (
        <div 
          className="absolute -top-1 -right-1 text-lg"
          style={{ color: 'var(--ds-chart-teal-bold, #0d9488)' }}
        >
          ★
        </div>
      )}
      
      {/* Gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--ds-border, var(--cp-bg-sunken, #e2e8f0))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>
            {score}%
          </span>
        </div>
      </div>
      
      {/* Label and trend */}
      <div className="flex flex-col">
        <span className="text-sm font-medium" style={{ color }}>
          {label}
        </span>
        {trend && (
          <div 
            className="flex items-center gap-1 text-xs"
            style={{ color: trend.direction === 'up' ? 'var(--ds-chart-teal-bold, #0d9488)' : trend.direction === 'down' ? 'var(--ds-text-danger, #ef4444)' : 'var(--ds-text-subtlest, #94a3b8)' }}
          >
            <TrendIcon className="w-3 h-3" />
            <span>{trend.value}% trend</span>
          </div>
        )}
      </div>
    </div>
  );
}
