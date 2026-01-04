/**
 * Compact Resource Card - CIO Executive Cockpit
 * DARK MODE SUPPORT INCLUDED
 * Updated with Contract Ring, Country Flag, Location Badge
 * 
 * CATALYST V5 COLORS:
 * - Available: Teal #0d9488
 * - Optimal: Blue #2563eb
 * - Over-allocated: Orange #d97706
 * - Error: Red #ef4444
 */

import { cn } from '@/lib/utils';
import { AlertTriangle, Lock } from 'lucide-react';
import { 
  getAssignmentTheme, 
  getAllocationTheme,
  CATALYST_V5,
} from '@/lib/catalyst-colors';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';
import { MiniGanttCard } from './MiniGanttCard';
import { Button } from '@/components/ui/button';
import { useResourceProfiles, getContractStatus } from '@/hooks/useResourceProfiles';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  // Get profile data with contract status
  const { getProfile } = useResourceProfiles();
  const profile = getProfile(id);
  const contractStatus = profile?.contractStatus || getContractStatus(null);
  
  // Avatar color from assignment theme
  const theme = getAssignmentTheme(assignmentName);
  // Status-based colors for border and progress bar
  const alloc = getAllocationTheme(totalAllocation);
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const isOverAllocated = totalAllocation > 100;
  const isCritical = totalAllocation > 120;
  const overflowAmount = Math.max(0, totalAllocation - 100);

  // Format contract end date
  const formatContractDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Contract ring styles
  const ringStyles = {
    healthy: 'ring-[#0d9488]', // Teal
    warning: 'ring-[#ca8a04]', // Gold
    critical: 'ring-[#be123c]', // Rose
    expired: 'ring-muted-foreground/40',
    permanent: 'ring-muted-foreground/30'
  };

  return (
    <div 
      className={cn(
        "relative border rounded-lg p-3 cursor-pointer group",
        // Micro-interactions: smooth transitions for hover effects
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]",
        isOverAllocated 
          ? "bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-800 hover:shadow-red-100 dark:hover:shadow-red-900/20" 
          : contractStatus.status === 'critical'
            ? "bg-red-50/20 dark:bg-red-950/10 border-border"
            : "bg-card border-border hover:border-primary/30"
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
        {/* Avatar with contract ring */}
        <div 
          onClick={(e) => { e.stopPropagation(); onOpen360(); }}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer shrink-0 transition-all",
            "ring-[3px]",
            ringStyles[contractStatus.status],
            contractStatus.status === 'critical' && "animate-pulse",
            "dark:ring-offset-slate-900"
          )}
          style={{ backgroundColor: isOverAllocated ? CATALYST_V5.error.hex : theme.accent }}
        >
          {initials}
        </div>

        {/* Info - Compact with country flag */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{name}</p>
            {/* Country flag with tooltip */}
            {profile?.country_flag_svg_url && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img 
                      src={profile.country_flag_svg_url} 
                      alt={profile.country || ''} 
                      className="w-4 h-3 object-cover rounded-sm flex-shrink-0 cursor-help"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{profile.country || 'Unknown'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-muted-foreground truncate leading-tight">{role || 'Team Member'}</p>
            {/* Location badge */}
            {profile?.location && (
              <span 
                className={cn(
                  "text-[9px] font-medium px-1 py-0.5 rounded",
                  profile.location.toLowerCase().includes('onsite') || profile.location.toLowerCase().includes('riyadh')
                    ? "bg-[#0d9488]/10 text-[#0d9488]" 
                    : "bg-[#2563eb]/10 text-[#2563eb]"
                )}
              >
                {profile.location.toLowerCase().includes('onsite') || profile.location.toLowerCase().includes('riyadh') ? 'ON' : 'OFF'}
              </span>
            )}
          </div>
        </div>

        {/* Allocation Badge with warning icon for over-allocated */}
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className="flex items-center gap-1">
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
          {/* Contract end date badge */}
          {contractStatus.status !== 'permanent' && profile?.contract_end_date && (
            <span className={cn(
              "text-[9px] font-medium px-1 py-0.5 rounded",
              contractStatus.status === 'critical' && 'bg-red-100 text-[#be123c]',
              contractStatus.status === 'warning' && 'bg-amber-100 text-[#ca8a04]',
              contractStatus.status === 'healthy' && 'bg-teal-100 text-[#0d9488]',
              contractStatus.status === 'expired' && 'bg-muted text-muted-foreground'
            )}>
              {formatContractDate(profile.contract_end_date)}
            </span>
          )}
        </div>
      </div>

      {/* Mini-Gantt Timeline */}
      <MiniGanttCard allocations={allocations} contractEndDate={profile?.contract_end_date} />

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
            className="text-[10px] h-5 px-2 transition-transform active:scale-95"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            Resolve Conflict
          </Button>
        ) : (
          <span className={cn(
            "text-[10px] font-medium px-2 py-1 rounded",
            contractStatus.status === 'critical' && 'bg-red-100 text-[#be123c]',
            contractStatus.status === 'warning' && 'bg-amber-100 text-[#ca8a04]',
            contractStatus.status === 'healthy' && 'bg-teal-100 text-[#0d9488]',
            contractStatus.status === 'expired' && 'bg-muted text-muted-foreground',
            contractStatus.status === 'permanent' && 'bg-muted text-muted-foreground'
          )}>
            {profile?.contract_end_date 
              ? formatContractDate(profile.contract_end_date)
              : 'Permanent'}
          </span>
        )}
      </div>
    </div>
  );
}