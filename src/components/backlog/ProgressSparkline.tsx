/**
 * ProgressSparkline - Tiny SVG trend line for KPI cards
 * 
 * Enterprise-grade, token-based, accessible sparkline component.
 * Uses olive primary token for stroke color.
 */

import { useMemo, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface ProgressPoint {
  date: string | Date;
  value: number;
}

interface ProgressSparklineProps {
  /** Array of progress data points (6-12 recommended) */
  data: ProgressPoint[];
  /** Width of sparkline in pixels */
  width?: number;
  /** Height of sparkline in pixels */
  height?: number;
  /** Accessible label */
  ariaLabel?: string;
}

/**
 * Normalize a single value to 0-100%
 * If value <= 1, treat as fraction; else treat as percent
 */
function normalizeValue(value: number): number {
  const raw = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function ProgressSparkline({ 
  data, 
  width = 100, 
  height = 24,
  ariaLabel = "Overall progress trend"
}: ProgressSparklineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; point: ProgressPoint; normalizedValue: number } | null>(null);
  
  // Normalize and prepare points
  const { points, pathD, minVal, maxVal } = useMemo(() => {
    if (!data || data.length < 2) {
      return { points: [], pathD: '', minVal: 0, maxVal: 100 };
    }
    
    // Take last 12 points max, chronologically
    const sliced = data.slice(-12);
    
    // Normalize all values
    const normalized = sliced.map(p => ({
      ...p,
      normalized: normalizeValue(p.value)
    }));
    
    const values = normalized.map(p => p.normalized);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Add padding to range for better visual
    const range = max - min || 1;
    const padding = range * 0.1;
    const adjustedMin = Math.max(0, min - padding);
    const adjustedMax = Math.min(100, max + padding);
    const adjustedRange = adjustedMax - adjustedMin || 1;
    
    // Calculate SVG points
    const svgPoints = normalized.map((p, i) => {
      const x = (i / (normalized.length - 1)) * width;
      const y = height - ((p.normalized - adjustedMin) / adjustedRange) * (height - 4) - 2;
      return { x, y, point: p, normalizedValue: p.normalized };
    });
    
    // Generate SVG path
    const path = svgPoints.map((pt, i) => 
      `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
    ).join(' ');
    
    return { 
      points: svgPoints, 
      pathD: path,
      minVal: adjustedMin,
      maxVal: adjustedMax
    };
  }, [data, width, height]);
  
  // No sparkline if insufficient data
  if (!data || data.length < 2) {
    return (
      <div 
        className="flex items-center gap-1 text-[10px] font-mono"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>Δ</span>
        <span>—</span>
      </div>
    );
  }
  
  // Calculate trend indicator
  const firstValue = normalizeValue(data[0].value);
  const lastValue = normalizeValue(data[data.length - 1].value);
  const delta = lastValue - firstValue;
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
          className="overflow-visible"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Main line - using primary token */}
          <path
            d={pathD}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Invisible hit areas for hover */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={6}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(pt)}
            />
          ))}
          
          {/* Hover dot */}
          {hoveredPoint && (
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={3}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
            />
          )}
        </svg>
        
        {/* Trend delta indicator */}
        <span 
          className="text-[10px] font-mono tabular-nums"
          style={{ 
            color: delta > 0 
              ? 'var(--status-success)' 
              : delta < 0 
                ? 'var(--status-danger)' 
                : 'var(--text-muted)'
          }}
        >
          {delta > 0 ? '+' : ''}{delta}%
        </span>
        
        {/* Tooltip for hovered point */}
        {hoveredPoint && (
          <Tooltip open>
            <TooltipTrigger asChild>
              <div 
                className="fixed pointer-events-none" 
                style={{ 
                  left: 0, 
                  top: 0,
                  width: 1,
                  height: 1
                }}
              />
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="z-[500] text-[11px]"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{hoveredPoint.normalizedValue}%</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {format(new Date(hoveredPoint.point.date), 'MMM d, yyyy')}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Generate mock progress history for demo purposes.
 * TODO: Replace with real snapshot history data when available.
 */
export function generateMockProgressHistory(currentProgress: number, pointCount: number = 8): ProgressPoint[] {
  const normalized = currentProgress <= 1 ? currentProgress * 100 : currentProgress;
  const clamped = Math.max(0, Math.min(100, normalized));
  
  // Generate realistic-looking historical data trending toward current value
  const points: ProgressPoint[] = [];
  const now = new Date();
  
  for (let i = pointCount - 1; i >= 0; i--) {
    const daysAgo = i * 14; // ~2 week intervals
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    
    // Create a natural curve toward current value
    const progress = clamped * (1 - (i / pointCount) * 0.6) + Math.random() * 5 - 2.5;
    const clampedProgress = Math.max(0, Math.min(100, progress));
    
    points.push({
      date: date.toISOString(),
      value: clampedProgress
    });
  }
  
  // Ensure last point matches current
  if (points.length > 0) {
    points[points.length - 1].value = clamped;
  }
  
  return points;
}
