/**
 * Health Gauge Component
 * Circular gauge showing health score with trend
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
    ? TrendingUp 
    : trend?.direction === 'down' 
    ? TrendingDown 
    : Minus;
    
  return (
    <div className="flex items-center gap-3 relative">
      {/* Winner star */}
      {isWinner && (
        <div 
          className="absolute -top-1 -right-1 text-lg"
          style={{ color: '#0d9488' }}
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
            stroke="#e2e8f0"
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
            style={{ color: trend.direction === 'up' ? '#0d9488' : trend.direction === 'down' ? '#ef4444' : '#94a3b8' }}
          >
            <TrendIcon className="w-3 h-3" />
            <span>{trend.value}% trend</span>
          </div>
        )}
      </div>
    </div>
  );
}
