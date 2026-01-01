/**
 * Compact Group Header - CIO Executive Cockpit
 * Max height: 44px | Inline stats | Minimal chrome
 */

import { ChevronRight, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssignmentTheme, getAllocationTheme } from '@/lib/catalyst-colors';

interface CompactGroupHeaderProps {
  assignmentName: string;
  resourceCount: number;
  availableCount: number;
  atCapacityCount: number;
  overCount: number;
  averageUtilization: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function CompactGroupHeader({ 
  assignmentName, 
  resourceCount, 
  availableCount, 
  atCapacityCount, 
  overCount, 
  averageUtilization, 
  isExpanded = true, 
  onToggle 
}: CompactGroupHeaderProps) {
  const theme = getAssignmentTheme(assignmentName);
  const utilTheme = getAllocationTheme(averageUtilization);
  const hasIssues = overCount > 0;

  return (
    <div 
      className={cn(
        "flex items-center justify-between h-11 px-4 rounded-lg cursor-pointer transition-all hover:shadow-sm",
        "border border-slate-200"
      )}
      style={{ backgroundColor: theme.bg }}
      onClick={onToggle}
    >
      {/* Left: Icon + Name + Alert */}
      <div className="flex items-center gap-3">
        <ChevronRight 
          className={cn(
            "w-4 h-4 transition-transform shrink-0",
            isExpanded && "rotate-90"
          )}
          style={{ color: theme.text }}
        />
        <div 
          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: theme.accent }}
        >
          <Users className="w-3 h-3 text-white" />
        </div>
        <span 
          className="text-sm font-semibold truncate max-w-[180px]"
          style={{ color: theme.text }}
        >
          {assignmentName}
        </span>

        {hasIssues && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            <AlertCircle className="w-3 h-3" />
            {overCount} over
          </span>
        )}
      </div>

      {/* Right: Stats + Utilization + Count */}
      <div className="flex items-center gap-4">
        {/* Inline stats */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
          {availableCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              {availableCount} avail
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {atCapacityCount} optimal
          </span>
        </div>

        {/* Utilization mini gauge */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${Math.min(averageUtilization, 100)}%`,
                backgroundColor: utilTheme.bar
              }}
            />
          </div>
          <span 
            className="text-xs font-bold tabular-nums min-w-[32px] text-right"
            style={{ color: utilTheme.text }}
          >
            {averageUtilization}%
          </span>
        </div>

        {/* Resource count badge */}
        <div 
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold"
          style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}
        >
          <Users className="w-3 h-3" />
          {resourceCount}
        </div>
      </div>
    </div>
  );
}
