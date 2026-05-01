// =====================================================
// BOARD COLUMN COMPONENT
// Kanban column with header and cards
// =====================================================

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BoardCard } from './BoardCard';
import { 
  WorkflowStatus, 
  STATUS_CONFIG, 
  FeatureWithDetails 
} from '@/types/views';
import { cn } from '@/lib/utils';

interface BoardColumnProps {
  status: WorkflowStatus;
  features: FeatureWithDetails[];
  wipLimit?: number;
  isOverLimit: boolean;
  onDragStart: (e: React.DragEvent, featureId: string) => void;
  onDrop: (e: React.DragEvent, status: WorkflowStatus) => void;
  onCardClick?: (featureId: string) => void;
  onDependencyClick?: (featureId: string) => void;
}

// Column header colors from spec
const COLUMN_HEADER_COLORS: Record<WorkflowStatus, string> = {
  backlog: '#c8ccd0',
  design: '#0d9488',
  ready_for_dev: 'var(--ds-text-brand, #3b82f6)',
  in_development: 'var(--ds-text-brand, #2563eb)',
  qa_testing: 'var(--ds-text-warning, #f59e0b)',
  uat_testing: '#9ca3af',
  in_beta: '#0d9488',
  ready_for_prod: '#0d9488',
  in_production: '#0f766e',
  on_hold: '#737373'
};

export function BoardColumn({
  status,
  features,
  wipLimit,
  isOverLimit,
  onDragStart,
  onDrop,
  onCardClick,
  onDependencyClick
}: BoardColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const config = STATUS_CONFIG[status];
  const isAtLimit = wipLimit && features.length === wipLimit;
  const headerColor = COLUMN_HEADER_COLORS[status];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop(e, status);
  };

  return (
    <div
      className={cn(
        'board-column min-w-[280px] max-w-[280px] flex-shrink-0 flex flex-col',
        isCollapsed && 'max-w-[48px] min-w-[48px]'
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'rounded-t-lg p-3 text-white',
          isCollapsed && 'rounded-b-lg'
        )}
        style={{ background: headerColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'transition-transform',
                isCollapsed && '-rotate-90'
              )}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {!isCollapsed && (
              <>
                <span className="font-semibold text-sm">{config.label}</span>
                <span className="px-1.5 py-0.5 rounded text-xs bg-white/20">
                  {features.length}
                </span>
              </>
            )}
          </div>
          {!isCollapsed && wipLimit && (
            <span className="text-xs opacity-80">WIP: {wipLimit}</span>
          )}
        </div>
        
        {/* Vertical label when collapsed */}
        {isCollapsed && (
          <div 
            className="mt-4 text-xs font-semibold"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {config.label}
          </div>
        )}
      </div>

      {/* Column Content */}
      {!isCollapsed && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex-1 p-2 rounded-b-lg min-h-[200px]',
            'bg-gray-50 dark:bg-gray-900',
            isDragOver && 'bg-yellow-50 dark:bg-yellow-900/20',
            isAtLimit && 'bg-[rgba(245,158,11,0.1)]',
            isOverLimit && 'bg-[rgba(239,68,68,0.1)]'
          )}
        >
          {features.map((feature) => (
            <BoardCard
              key={feature.id}
              feature={feature}
              onDragStart={onDragStart}
              onClick={() => onCardClick?.(feature.id)}
              onDependencyClick={() => onDependencyClick?.(feature.id)}
            />
          ))}

          {/* Empty State */}
          {features.length === 0 && (
            <div className="h-24 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              Drop items here
            </div>
          )}
        </div>
      )}
    </div>
  );
}
