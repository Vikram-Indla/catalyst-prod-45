/**
 * Compact Resource Card - CIO Executive Cockpit
 * Max height: 72px | Dense information | Risk indicators
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
  const theme = getAssignmentTheme(assignmentName);
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
        {/* Avatar - Compact */}
        <div 
          onClick={(e) => { e.stopPropagation(); onOpen360(); }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 shrink-0 transition-all"
          style={{ backgroundColor: theme.accent }}
        >
          {initials}
        </div>

        {/* Info - Compact */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{name}</p>
          <p className="text-[11px] text-slate-500 truncate leading-tight">{role || 'Team Member'}</p>
        </div>

        {/* Allocation Badge - Compact */}
        <span 
          className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
          style={{ backgroundColor: alloc.bg, color: alloc.text }}
        >
          {totalAllocation}%
        </span>
      </div>

      {/* Mini Progress Bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${Math.min(totalAllocation, 100)}%`,
              backgroundColor: alloc.bar
            }}
          />
        </div>
        <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">{alloc.label}</span>
      </div>
    </div>
  );
}
