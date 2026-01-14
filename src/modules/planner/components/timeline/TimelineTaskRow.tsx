// =====================================================
// TIMELINE LEFT PANEL TASK ROW
// Task info with workstream color indicator
// =====================================================

import { cn } from '@/lib/utils';
import { getTaskColor } from '@/lib/workstream-colors';
import type { PlannerTask } from '../../types';

interface TimelineTaskRowProps {
  task: PlannerTask;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export function TimelineTaskRow({ 
  task, 
  isSelected, 
  isHovered,
  onClick,
  onHover
}: TimelineTaskRowProps) {
  const isCompleted = task.status === 'done';
  const colors = getTaskColor(task.status, task.teamName);
  
  return (
    <div
      className={cn(
        "relative flex items-center h-16 border-b border-border cursor-pointer",
        "transition-colors duration-150",
        isSelected && "bg-blue-50 dark:bg-blue-950/30",
        isHovered && !isSelected && "bg-gray-50 dark:bg-gray-900/30"
      )}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {/* Workstream Color Bar */}
      <div 
        className="w-1 h-10 rounded-full flex-shrink-0 ml-3"
        style={{ backgroundColor: colors.hex }}
      />
      
      {/* Task Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1 px-3">
        {/* Row 1: Title + Key */}
        <div className="flex items-center gap-2">
          <span 
            className={cn(
              "text-sm font-semibold text-gray-900 dark:text-gray-100 truncate",
              isCompleted && "line-through text-gray-500"
            )}
          >
            {task.title}
          </span>
          <span className="text-[10px] font-mono font-medium text-gray-400 flex-shrink-0">
            {task.key}
          </span>
        </div>
        
        {/* Row 2: Avatar + Name + Workstream */}
        <div className="flex items-center gap-2">
          {task.assigneeInitials && (
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: colors.hex }}
            >
              {task.assigneeInitials}
            </div>
          )}
          {task.assigneeName && (
            <span className="text-[11px] text-gray-500 truncate max-w-[100px]">
              {task.assigneeName}
            </span>
          )}
          {task.teamName && (
            <>
              <span className="text-gray-300">•</span>
              <span 
                className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-[120px]"
                style={{ 
                  backgroundColor: colors.hexLight,
                  color: colors.hex
                }}
              >
                {task.teamName}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
