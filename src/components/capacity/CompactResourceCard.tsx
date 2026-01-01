/**
 * Compact Resource Card - CIO Executive Cockpit
 * Max height: 72px | Dense information | Risk indicators
 * FIX #4: Avatar colors by assignment
 * FIX #7: Status labels with proper colors
 * FIX #9: Card left borders by status
 * FIX #10: Progress bar colors by status
 */

import { cn } from '@/lib/utils';
import { getAssignmentTheme, getAllocationTheme } from '@/lib/catalyst-colors';

interface CompactResourceCardProps {
  id: string;
  name: string;
  role?: string;
  department?: string;
  assignmentName?: string | null;
  totalAllocation: number;
  onOpen360: () => void;
  onEdit: () => void;
}

export function CompactResourceCard({ 
  id,
  name, 
  role, 
  department,
  assignmentName,
  totalAllocation,
  onOpen360, 
  onEdit 
}: CompactResourceCardProps) {
  // FIX #4: Avatar color from assignment theme
  const theme = getAssignmentTheme(assignmentName);
  // FIX #9 & #10: Status-based colors for border and progress bar
  const alloc = getAllocationTheme(totalAllocation);
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const isRisk = totalAllocation > 100;
  const isStretched = totalAllocation > 100 && totalAllocation <= 120;

  return (
    <div 
      className={cn(
        "relative bg-white border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md group",
        isRisk ? "border-amber-200" : "border-slate-200 hover:border-slate-300"
      )}
      style={{ 
        // FIX #9: Card left border by STATUS (not assignment)
        borderLeftWidth: '3px', 
        borderLeftColor: alloc.bar,
        maxHeight: '72px',
      }}
      onClick={onEdit}
    >
      {/* Risk indicator dot */}
      {isRisk && (
        <div 
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: isStretched ? '#d97706' : '#8b7355' }}
        />
      )}

      <div className="flex items-center gap-2.5">
        {/* FIX #4: Avatar with assignment-based color */}
        <div 
          onClick={(e) => { e.stopPropagation(); onOpen360(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 shrink-0 transition-all"
          style={{ backgroundColor: theme.accent }}
        >
          {initials}
        </div>

        {/* Info - Compact */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{name}</p>
          <p className="text-[11px] text-slate-500 truncate leading-tight">{role || 'Team Member'}</p>
        </div>

        {/* Allocation Badge with status color */}
        <span 
          className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
          style={{ backgroundColor: alloc.bg, color: alloc.text }}
        >
          {totalAllocation}%
        </span>
      </div>

      {/* Mini Progress Bar with status label */}
      <div className="mt-2 flex items-center gap-2">
        {/* FIX #10: Progress bar with status-based color */}
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${Math.min(totalAllocation, 100)}%`,
              backgroundColor: alloc.bar
            }}
          />
        </div>
        {/* FIX #7: Status label with proper color (NOT grey) */}
        <span 
          className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ 
            color: alloc.labelColor,
            backgroundColor: alloc.labelBg
          }}
        >
          {alloc.label}
        </span>
      </div>
    </div>
  );
}
