// =====================================================
// ENTERPRISE GANTT BAR COMPONENT
// Workstream-colored bars with progress fill
// =====================================================

import { cn } from '@/lib/utils';
import { getTaskColor } from '@/lib/workstream-colors';
import { useState } from 'react';
import { format } from 'date-fns';
import type { PlannerTask } from '../../types';

interface GanttBarEnterpriseProps {
  task: PlannerTask;
  left: number;
  width: number;
  onClick?: () => void;
  isHovered?: boolean;
  onHover?: (hovered: boolean) => void;
}

// Minimum bar width for readable content
const MIN_BAR_WIDTH = 180;

export function GanttBarEnterprise({ 
  task, 
  left, 
  width, 
  onClick,
  isHovered = false,
  onHover
}: GanttBarEnterpriseProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const isCompleted = task.status === 'done';
  const colors = getTaskColor(task.status, task.teamName);
  const progress = Math.min(100, Math.max(0, task.progress || 0));
  
  const handleMouseEnter = () => {
    setShowTooltip(true);
    onHover?.(true);
  };
  
  const handleMouseLeave = () => {
    setShowTooltip(false);
    onHover?.(false);
  };

  // Ensure minimum width for readability
  const effectiveWidth = Math.max(MIN_BAR_WIDTH, width);
  
  // Only show progress % if bar is wide enough
  const showProgress = effectiveWidth > 200;

  return (
    <div
      className="absolute top-2 h-12 z-10"
      style={{ left: Math.max(4, left), width: effectiveWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Bar Container - Workstream colored background */}
      <div
        className={cn(
          "relative h-full rounded-md cursor-pointer overflow-hidden",
          "border-l-4 transition-all duration-200",
          "shadow-sm hover:shadow-md",
          isHovered && "shadow-lg -translate-y-0.5",
          isCompleted && "opacity-80"
        )}
        style={{ 
          borderLeftColor: colors.hex,
          backgroundColor: colors.hexLight,
        }}
      >
        {/* Progress Fill Layer */}
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300"
          style={{ 
            width: `${progress}%`,
            backgroundColor: colors.hexFill,
          }}
        />
        
        {/* Content Layer (on top of progress) */}
        <div className="relative h-full flex items-center gap-2 px-3 z-10">
          {/* Title - REQUIRED, takes priority */}
          <span 
            className={cn(
              "flex-1 text-xs font-semibold truncate min-w-0",
              isCompleted && "line-through"
            )}
            style={{ color: colors.hex }}
          >
            {task.title}
          </span>
          
          {/* Right side content */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Progress Percentage - only if bar is wide enough */}
            {showProgress && (
              <span 
                className="text-[10px] font-bold"
                style={{ color: colors.hex }}
              >
                {isCompleted ? '✓' : `${progress}%`}
              </span>
            )}
            
            {/* Avatar - REQUIRED */}
            {task.assigneeInitials && (
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: colors.hex }}
              >
                {task.assigneeInitials}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white p-3 rounded-lg text-xs min-w-[220px] shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors.hex }}
              />
              <span className="font-semibold truncate">{task.title}</span>
            </div>
            
            {/* Details */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-400">Key</span>
                <span className="font-mono">{task.key}</span>
              </div>
              {task.teamName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Workstream</span>
                  <span>{task.teamName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Dates</span>
                <span>
                  {task.startDate ? format(new Date(task.startDate), 'MMM d') : '—'} – {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                </span>
              </div>
              {task.assigneeName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Assignee</span>
                  <span>{task.assigneeName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Progress</span>
                <span>{progress}%</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: colors.hex }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
