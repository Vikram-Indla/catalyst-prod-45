/**
 * Assignment Group Header - Enterprise Grade
 * - Icon color matches assignment
 * - Taller capacity bar (8px)
 * - Background tint matching assignment (5% opacity)
 * - Bold styling
 */

import { ChevronDown, ChevronUp, Users } from 'lucide-react';
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
        'flex items-center justify-between px-5 py-4 border border-[#e5e5e5] rounded-xl transition-all',
        onToggle && 'cursor-pointer hover:shadow-md'
      )}
      style={{ 
        backgroundColor: `${color}08`, // 5% opacity tint
        borderLeftWidth: '4px',
        borderLeftColor: color,
      }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        {/* ICON — Color matches assignment */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: color }}
        >
          <Users className="w-6 h-6 text-white" />
        </div>

        {/* INFO */}
        <div>
          <span className="text-lg font-bold text-[#0a0a0a]">{assignmentName}</span>
          <div className="flex items-center gap-4 mt-1">
            {availableCount > 0 && (
              <span className="text-sm text-[#525252] flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATALYST.teal.primary }}
                />
                <span className="font-medium">{availableCount}</span> available
              </span>
            )}
            {atCapacityCount > 0 && (
              <span className="text-sm text-[#525252] flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATALYST.blue.primary }}
                />
                <span className="font-medium">{atCapacityCount}</span> at capacity
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* TALLER CAPACITY BAR (8px) — Color matches assignment */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium text-[#737373]">Avg: {averageUtilization}%</span>
          <div className="w-32 h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${Math.min(averageUtilization, 100)}%`,
                backgroundColor: color
              }}
            />
          </div>
        </div>

        {/* COUNT BADGE */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Users className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-bold" style={{ color }}>
            {resourceCount}
          </span>
          <span className="text-sm text-[#525252]">resources</span>
        </div>

        {/* CHEVRON */}
        {onToggle && (
          isExpanded 
            ? <ChevronUp className="w-5 h-5 text-[#737373]" />
            : <ChevronDown className="w-5 h-5 text-[#737373]" />
        )}
      </div>
    </div>
  );
}
