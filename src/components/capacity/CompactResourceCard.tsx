/**
 * Compact Resource Card - CIO Executive Cockpit
 * DARK MODE SUPPORT INCLUDED
 * Updated for Time-Boxed Allocations with mini-gantt timeline
 * 
 * CATALYST V5 COLORS:
 * - Available: Teal #0d9488
 * - Optimal: Blue #2563eb
 * - Over-allocated: Orange #d97706
 * - Error: Red #ef4444
 */

import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
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
  const isOverAllocated = totalAllocation > 100;
  const isCritical = totalAllocation > 120;
  const overflowAmount = Math.max(0, totalAllocation - 100);

  return (
    <div 
      className={cn(
        "relative border rounded-lg p-3 cursor-pointer transition-all group",
        isOverAllocated 
          ? "bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-800 hover:shadow-red-100 dark:hover:shadow-red-900/20 hover:shadow-md" 
          : "bg-card border-border hover:border-border/80 hover:shadow-md"
      )}
      style={{ 
        borderLeftWidth: '4px', 
        borderLeftColor: isOverAllocated ? CATALYST_V5.error.hex : alloc.bar,
      }}
      onClick={onEdit}
    >
      {/* Risk indicator dot - Catalyst V5 colors */}
      {isOverAllocated && (
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse flex items-center justify-center"
          style={{ backgroundColor: isCritical ? CATALYST_V5.error.hex : CATALYST_V5.overAllocated.hex }}
        >
          <span className="text-[7px] text-white font-bold">!</span>
        </div>
      )}

      {/* Header: Avatar + Name + Allocation */}
      <div className="flex items-center gap-2.5 mb-2">
        {/* Avatar with status-based color for over-allocated */}
        <div 
          onClick={(e) => { e.stopPropagation(); onOpen360(); }}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-offset-1 shrink-0 transition-all",
            isOverAllocated ? "hover:ring-red-500" : "hover:ring-blue-500",
            "dark:ring-offset-slate-900"
          )}
          style={{ backgroundColor: isOverAllocated ? CATALYST_V5.error.hex : theme.accent }}
        >
          {initials}
        </div>

        {/* Info - Compact */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate leading-tight">{role || 'Team Member'}</p>
        </div>

        {/* Allocation Badge with warning icon for over-allocated */}
        <div className="flex items-center gap-1 shrink-0">
          {isOverAllocated && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          )}
          <span 
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded",
              isOverAllocated && "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
            )}
            style={!isOverAllocated ? { backgroundColor: alloc.bg, color: alloc.text } : undefined}
          >
            {totalAllocation}%
          </span>
        </div>
      </div>

      {/* Mini-Gantt Timeline */}
      <MiniGanttCard allocations={allocations} />

      {/* Footer: Status + Action button */}
      <div className="flex items-center justify-between">
        <span 
          className={cn(
            "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1",
            isOverAllocated && "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
          )}
          style={!isOverAllocated ? { 
            color: alloc.labelColor,
            backgroundColor: alloc.labelBg
          } : undefined}
        >
          {isOverAllocated && <AlertTriangle className="w-2.5 h-2.5" />}
          {isOverAllocated ? `+${overflowAmount}% OVER` : alloc.label}
        </span>
        
        {isOverAllocated ? (
          <Button 
            variant="destructive" 
            size="sm" 
            className="text-[10px] h-5 px-2"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            Resolve Conflict
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] text-muted-foreground h-5 px-2 hover:text-primary"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            Edit Allocations
          </Button>
        )}
      </div>
    </div>
  );
}