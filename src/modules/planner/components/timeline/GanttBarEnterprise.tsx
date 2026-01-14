// =====================================================
// ENTERPRISE GANTT BAR COMPONENT
// Clean white bars with workstream color stripe
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

  // Minimum width for readable content
  const effectiveWidth = Math.max(120, width);

  return (
    <div
      className="absolute top-2 h-12 z-10"
      style={{ left: Math.max(4, left), width: effectiveWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Bar Container */}
      <div
        className={cn(
          "relative h-full rounded-md bg-white cursor-pointer",
          "border-l-[5px] transition-all duration-200",
          "shadow-sm hover:shadow-md",
          isHovered && "shadow-lg -translate-y-0.5",
          isCompleted && "opacity-80"
        )}
        style={{ borderLeftColor: colors.hex }}
      >
        {/* Inner Content */}
        <div className="h-full flex items-center gap-2 px-3">
          {/* Progress Bar (Inline) */}
          <div className="w-4 h-6 flex-shrink-0 flex items-center">
            <div className="relative w-full h-4 bg-gray-100 rounded-sm overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-sm transition-all"
                style={{ 
                  width: `${progress}%`, 
                  backgroundColor: colors.hex 
                }}
              />
            </div>
          </div>
          
          {/* Title */}
          <span 
            className={cn(
              "flex-1 text-xs font-semibold text-gray-800 truncate",
              isCompleted && "line-through text-gray-500"
            )}
          >
            {effectiveWidth > 160 ? task.title : task.key}
          </span>
          
          {/* Progress Percentage */}
          <span 
            className="text-[10px] font-bold flex-shrink-0"
            style={{ color: colors.hex }}
          >
            {isCompleted ? '✓' : `${progress}%`}
          </span>
          
          {/* Avatar */}
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
