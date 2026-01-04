/**
 * Compact Resource Card - CIO Executive Cockpit
 * Max height: 72px | Dense information | Risk indicators
 * Updated for Time-Boxed Allocations with mini-gantt timeline
 * 
 * CATALYST V5 COLORS:
 * - Available: Teal #0d9488
 * - Optimal: Blue #2563eb
 * - Over-allocated: Orange #d97706
 * - Error: Red #ef4444
 */

import { cn } from '@/lib/utils';
import { 
  getAssignmentTheme, 
  getAllocationTheme,
  CATALYST_V5,
} from '@/lib/catalyst-colors';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';
import { MiniGanttCard } from './MiniGanttCard';
import { Button } from '@/components/ui/button';

interface CompactResourceCardProps {
  id: string;
  name: string;
  role?: string;
  department?: string;
  assignmentName?: string | null;
  totalAllocation: number;
  allocations?: ResourceAllocation[];
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
  allocations = [],
  onOpen360, 
  onEdit 
}: CompactResourceCardProps) {
  // Avatar color from assignment theme
  const theme = getAssignmentTheme(assignmentName);
  // Status-based colors for border and progress bar
  const alloc = getAllocationTheme(totalAllocation);
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const isRisk = totalAllocation > 100;
  const isCritical = totalAllocation > 120;

  return (
    <div 
      className={cn(
        "relative bg-white border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md group",
        isRisk ? "border-orange-200" : "border-slate-200 hover:border-slate-300"
      )}
      style={{ 
        borderLeftWidth: '3px', 
        borderLeftColor: alloc.bar,
      }}
      onClick={onEdit}
    >
      {/* Risk indicator dot - Catalyst V5 colors */}
      {isRisk && (
        <div 
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: isCritical ? CATALYST_V5.error.hex : CATALYST_V5.overAllocated.hex }}
        />
      )}

      {/* Header: Avatar + Name + Allocation */}
      <div className="flex items-center gap-2.5 mb-2">
        {/* Avatar with assignment-based color */}
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

      {/* Mini-Gantt Timeline */}
      <MiniGanttCard allocations={allocations} />

      {/* Footer: Status + Edit button */}
      <div className="flex items-center justify-between">
        <span 
          className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ 
            color: alloc.labelColor,
            backgroundColor: alloc.labelBg
          }}
        >
          {alloc.label}
        </span>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[10px] text-slate-500 h-5 px-2 hover:text-primary"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          Edit Allocations
        </Button>
      </div>
    </div>
  );
}
