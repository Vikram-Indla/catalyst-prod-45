// =====================================================
// BOARD CARD COMPONENT
// Feature card for Kanban board
// =====================================================

import React from 'react';
import { FeatureWithDetails, PRIORITY_CONFIG } from '@/types/views';
import { DependencyBadge } from '@/components/dependencies/DependencyBadge';
import { cn } from '@/lib/utils';

interface BoardCardProps {
  feature: FeatureWithDetails;
  onDragStart: (e: React.DragEvent, featureId: string) => void;
  onClick?: () => void;
  onDependencyClick?: () => void;
}

// Priority border colors as specified in the spec
const PRIORITY_BORDER_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#c8ccd0'
};

export function BoardCard({ 
  feature, 
  onDragStart, 
  onClick,
  onDependencyClick 
}: BoardCardProps) {
  const priorityConfig = PRIORITY_CONFIG[feature.priority];
  const hasBlocker = feature.dependency_counts.blocked_by > 0;
  const hasDependencies = feature.dependency_counts.blocks > 0 || feature.dependency_counts.blocked_by > 0;
  const borderColor = PRIORITY_BORDER_COLORS[feature.priority] || PRIORITY_BORDER_COLORS.low;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, feature.id)}
      onClick={onClick}
      className={cn(
        'board-card relative bg-white dark:bg-gray-800 rounded-lg p-3 mb-2 border cursor-grab',
        'transition-all hover:shadow-md hover:-translate-y-0.5',
        'hover:border-[#2563eb]',
        'active:cursor-grabbing'
      )}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: borderColor
      }}
    >
      {/* Dependency Badge */}
      {hasDependencies && (
        <DependencyBadge
          itemType="feature"
          itemId={feature.id}
          onClick={() => onDependencyClick?.()}
          size="sm"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-[#2563eb] dark:text-[#60a5fa]">
          {feature.feature_id}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{
            background: priorityConfig?.bgColor,
            color: priorityConfig?.color
          }}
        >
          {priorityConfig?.label}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium mb-2 line-clamp-2 text-foreground">
        {feature.title}
      </p>

      {/* Release Badge */}
      {feature.release && (
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6'
            }}
          >
            {feature.release.version}
          </span>
        </div>
      )}

      {/* Progress Bar (if has stories) */}
      {feature.story_count > 0 && (
        <div className="mb-2">
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${feature.progress_percentage}%`,
                background: feature.progress_percentage === 100 ? '#0d9488' : '#2563eb'
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Assignee Avatar */}
          {feature.assignee ? (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-medium"
              title={feature.assignee.full_name}
            >
              {feature.assignee.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px]">
              ?
            </div>
          )}
          <span>{feature.total_story_points || 0} SP</span>
        </div>
        <span>{feature.completed_story_count}/{feature.story_count} Stories</span>
      </div>
    </div>
  );
}
