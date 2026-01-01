/**
 * Assignment Group Header with Capacity Bar
 * Colors match assignment type
 */

import { ChevronDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssignmentColor, CATALYST } from '@/lib/catalyst-colors';

interface AssignmentGroupHeaderProps {
  assignmentName: string;
  resourceCount: number;
  availableCount: number;
  atCapacityCount: number;
  averageUtilization: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function AssignmentGroupHeader({
  assignmentName,
  resourceCount,
  availableCount,
  atCapacityCount,
  averageUtilization,
  isExpanded = true,
  onToggle,
}: AssignmentGroupHeaderProps) {
  const color = getAssignmentColor(assignmentName);

  return (
    <div 
      className={cn(
        'flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl transition-colors',
        onToggle && 'cursor-pointer hover:bg-[#fafafa]'
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        {/* ICON — Color matches assignment */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Users className="w-5 h-5 text-white" />
        </div>

        {/* INFO */}
        <div>
          <span className="font-semibold text-[#0a0a0a]">{assignmentName}</span>
          <div className="flex items-center gap-3 mt-0.5">
            {availableCount > 0 && (
              <span className="text-xs text-[#737373] flex items-center gap-1">
                <span 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: CATALYST.teal.primary }}
                />
                {availableCount} available
              </span>
            )}
            {atCapacityCount > 0 && (
              <span className="text-xs text-[#737373] flex items-center gap-1">
                <span 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: CATALYST.blue.primary }}
                />
                {atCapacityCount} at capacity
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* CAPACITY BAR — Color matches assignment */}
        <div className="w-24 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${Math.min(averageUtilization, 100)}%`,
              backgroundColor: color
            }}
          />
        </div>

        {/* COUNT BADGE */}
        <span className="text-sm text-[#737373] bg-[#f5f5f4] px-2.5 py-1 rounded-full">
          {resourceCount} resources
        </span>

        {/* CHEVRON */}
        {onToggle && (
          <ChevronDown 
            className={cn(
              'w-5 h-5 text-[#a3a3a3] transition-transform',
              isExpanded && 'rotate-180'
            )} 
          />
        )}
      </div>
    </div>
  );
}
