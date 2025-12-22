// =====================================================
// TIMELINE BAR COMPONENT
// Gantt bar representing a feature
// =====================================================

import React from 'react';
import { Link2 } from 'lucide-react';
import { TimelineFeature } from '@/services/timelineService';
import { PRIORITY_CONFIG } from '@/types/views';
import { cn } from '@/lib/utils';

interface TimelineBarProps {
  feature: TimelineFeature;
  left: number;
  width: number;
  onClick?: () => void;
}

// Priority colors matching the design spec
const PRIORITY_BAR_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#c8ccd0'
};

export function TimelineBar({ feature, left, width, onClick }: TimelineBarProps) {
  const hasBlocker = feature.dependency_counts.blocked_by > 0;
  const barColor = PRIORITY_BAR_COLORS[feature.priority] || PRIORITY_BAR_COLORS.low;

  return (
    <div
      onClick={onClick}
      className={cn(
        'absolute h-7 top-[10px] rounded cursor-pointer',
        'flex items-center px-2 text-white text-xs font-medium',
        'overflow-hidden whitespace-nowrap text-ellipsis',
        'transition-all hover:-translate-y-0.5 hover:shadow-lg hover:z-10'
      )}
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 50)}px`,
        background: barColor
      }}
      title={`${feature.feature_id}: ${feature.title}`}
    >
      {/* Progress Fill */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-l"
        style={{ width: `${feature.progress_percentage}%` }}
      />
      
      {/* Content */}
      <span className="relative z-10 truncate">
        {feature.feature_id}: {feature.title}
      </span>

      {/* Dependency Indicator */}
      {hasBlocker && (
        <div 
          className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center"
          title="Has dependencies"
        >
          <Link2 className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
}
