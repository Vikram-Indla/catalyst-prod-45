/**
 * Assignment Group Header - Enterprise Grade
 * - Colored top border (3px) matching assignment
 * - Icon color matches assignment
 * - Taller capacity bar (8px)
 * - Background tint matching assignment (5% opacity)
 * - Bold styling with over count
 */

import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssignmentColor, CATALYST } from '@/lib/catalyst-colors';

interface AssignmentGroupHeaderProps {
  assignmentName: string;
  resourceCount: number;
  availableCount: number;
  atCapacityCount: number;
  overCount?: number;
  averageUtilization: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function AssignmentGroupHeader({
  assignmentName,
  resourceCount,
  availableCount,
  atCapacityCount,
  overCount = 0,
  averageUtilization,
  isExpanded = true,
  onToggle,
}: AssignmentGroupHeaderProps) {
  const color = getAssignmentColor(assignmentName);

  return (
    <div 
      className={cn(
        'relative overflow-hidden border border-[#e5e5e5] rounded-xl transition-all',
        onToggle && 'cursor-pointer hover:shadow-lg'
      )}
      style={{ 
        backgroundColor: `${color}08`, // 5% opacity tint
      }}
      onClick={onToggle}
    >
      {/* TOP COLOR BAR - 3px */}
      <div 
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center justify-between px-5 py-4 pt-5">
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
            <h3 className="text-lg font-bold text-[#0a0a0a]">{assignmentName}</h3>
            <div className="flex items-center gap-4 mt-1.5">
              {availableCount > 0 && (
                <span className="text-sm text-[#525252] flex items-center gap-1.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATALYST.teal.primary }}
                  />
                  <span className="font-semibold">{availableCount}</span> available
                </span>
              )}
              {atCapacityCount > 0 && (
                <span className="text-sm text-[#525252] flex items-center gap-1.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATALYST.blue.primary }}
                  />
                  <span className="font-semibold">{atCapacityCount}</span> at capacity
                </span>
              )}
              {overCount > 0 && (
                <span className="text-sm text-[#525252] flex items-center gap-1.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATALYST.bronze.primary }}
                  />
                  <span className="font-semibold">{overCount}</span> over
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* TALLER CAPACITY BAR (8px) — Color matches assignment */}
          <div className="flex items-center gap-3">
            <div className="w-36 h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min(averageUtilization, 100)}%`,
                  backgroundColor: color
                }}
              />
            </div>
            <span 
              className="text-sm font-bold min-w-[40px]"
              style={{ color }}
            >
              {averageUtilization}%
            </span>
          </div>

          {/* COUNT BADGE — Prominent */}
          <div 
            className="flex flex-col items-center px-4 py-2 rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <span className="text-xl font-bold" style={{ color }}>
              {resourceCount}
            </span>
            <span className="text-[10px] font-medium text-[#525252] uppercase tracking-wider">
              resources
            </span>
          </div>

          {/* CHEVRON */}
          {onToggle && (
            isExpanded 
              ? <ChevronUp className="w-5 h-5 text-[#737373]" />
              : <ChevronDown className="w-5 h-5 text-[#737373]" />
          )}
        </div>
      </div>
    </div>
  );
}