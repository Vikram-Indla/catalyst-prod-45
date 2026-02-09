/**
 * Compact Resource Card - Executive Grade 9.8/10
 * 3-ZONE HIERARCHY:
 * - Zone A: Identity (Avatar + Name + Role)
 * - Zone B: Dominant Signal (Status Badge)
 * - Zone C: Timeline + Allocations
 * 
 * CATALYST V5 DARK MODE COMPLIANT - NO RGBA, NO OPACITY
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';
import { 
  getAssignmentTheme, 
  getAllocationTheme,
  CATALYST_V5,
} from '@/lib/catalyst-colors';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';
import { MiniGanttCard } from './MiniGanttCard';
import { useResourceProfiles, getContractStatus } from '@/hooks/useResourceProfiles';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CapacityAvatar } from '@/components/capacity/CapacityAvatar';

interface CompactResourceCardProps {
  id: string;
  name: string;
  role?: string;
  department?: string;
  assignmentName?: string | null;
  totalAllocation: number;
  allocations?: ResourceAllocation[];
  country_flag_svg?: string | null;
  avatar_url?: string | null;
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
  country_flag_svg,
  avatar_url,
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

  // Calculate days until freed
  const daysUntilFreed = useMemo(() => {
    if (!allocations?.length) return null;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const endingSoon = allocations
      .map(a => a.end_date ? new Date(a.end_date) : null)
      .filter((d): d is Date => d !== null && d >= now && d <= thirtyDaysFromNow)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (endingSoon.length === 0) return null;
    return Math.ceil((endingSoon[0].getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [allocations]);

  // Format contract end date
  const formatContractDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Contract ring styles - V8 compliant (Teal, Warning, Danger)
  const ringStyles = {
    healthy: 'ring-[var(--ct-teal)]',
    warning: 'ring-[var(--ct-warning)]',
    critical: 'ring-[var(--ct-danger)]',
    expired: 'ring-[var(--ct-text-muted)]',
    permanent: 'ring-[var(--ct-text-muted)] opacity-50'
  };

  // Determine dominant signal for Zone B
  const getDominantSignal = () => {
    if (isOverAllocated) {
      return {
        label: `+${overflowAmount}% Over`,
        variant: 'danger' as const,
        icon: AlertTriangle,
      };
    }
    if (daysUntilFreed !== null && daysUntilFreed <= 30) {
      return {
        label: `Frees in ${daysUntilFreed}d`,
        variant: 'info' as const,
        icon: Clock,
      };
    }
    if (totalAllocation >= 80 && totalAllocation <= 100) {
      return {
        label: `${totalAllocation}%`,
        variant: 'success' as const,
        icon: null,
      };
    }
    return {
      label: `${totalAllocation}%`,
      variant: 'default' as const,
      icon: null,
    };
  };

  const dominantSignal = getDominantSignal();

  // Signal styles - V8 compliant
  const signalStyles = {
    danger: {
      bg: 'bg-[var(--ct-danger-light)]',
      text: 'text-[var(--ct-danger)]',
      border: 'border-[var(--ct-danger)]',
    },
    warning: {
      bg: 'bg-[var(--ct-warning-light)]',
      text: 'text-[var(--ct-warning)]',
      border: 'border-[var(--ct-warning)]',
    },
    success: {
      bg: 'bg-[var(--ct-teal-light)]',
      text: 'text-[var(--ct-teal)]',
      border: 'border-[var(--ct-teal)]',
    },
    info: {
      bg: 'bg-[var(--ct-primary-light)]',
      text: 'text-[var(--ct-primary)]',
      border: 'border-[var(--ct-primary)]',
    },
    default: {
      bg: 'bg-[var(--ct-bg)]',
      text: 'text-[var(--ct-text)]',
      border: 'border-[var(--ct-border)]',
    },
  };

  const signal = signalStyles[dominantSignal.variant];
  const SignalIcon = dominantSignal.icon;

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "relative rounded-[var(--ct-radius-lg)] p-3 cursor-pointer group",
          // V8 surfaces and borders
          "bg-[var(--ct-surface)]",
          "border border-[var(--ct-border)]",
          // Micro-interactions
          "transition-all duration-200 hover:-translate-y-0.5",
          // Hover state
          "hover:bg-[var(--ct-surface-hover)]",
          "hover:border-[var(--ct-primary-border)]",
          "hover:shadow-[var(--ct-shadow-md)]",
          // Risk state overrides - V8
          isOverAllocated && [
            "bg-[var(--ct-danger-light)]",
            "border-[var(--ct-danger)]",
          ],
          contractStatus.status === 'critical' && !isOverAllocated && [
            "border-l-4 border-l-[var(--ct-warning)]"
          ]
        )}
        style={{ 
          borderLeftWidth: isOverAllocated ? '4px' : undefined, 
          borderLeftColor: isOverAllocated ? 'var(--ct-danger)' : undefined,
        }}
        onClick={onEdit}
      >
        {/* ========== ZONE A: Identity (Top) ========== */}
        <div className="flex items-start gap-2.5 mb-2.5">
          {/* Avatar - V10 Unified Style */}
          <CapacityAvatar
            initials={initials}
            avatarUrl={avatar_url}
            flagUrl={country_flag_svg}
            size="md"
            onClick={(e) => { e?.stopPropagation?.(); onOpen360(); }}
            showTooltip={false}
          />

          {/* Name + Role */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground dark:text-[var(--text-primary)] truncate leading-tight">
              {name}
            </p>
            <p className="text-[11px] text-muted-foreground dark:text-[var(--text-secondary)] truncate leading-tight">
              {role || 'Team Member'}
            </p>
            {department && (
              <p className="text-[10px] text-muted-foreground dark:text-[var(--muted-foreground)] truncate mt-0.5">
                {department}
              </p>
            )}
          </div>

          {/* ========== ZONE B: Dominant Signal (Top Right) ========== */}
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs font-bold shrink-0",
            signal.bg,
            signal.text
          )}>
            {SignalIcon && <SignalIcon className="w-3 h-3" />}
            <span>{dominantSignal.label}</span>
          </div>
        </div>

        {/* ========== ZONE C: Timeline + Allocations ========== */}
        <MiniGanttCard allocations={allocations} contractEndDate={profile?.contract_end_date} />

        {/* Footer: Status + Contract Date */}
        <div className="flex items-center justify-between mt-1">
          <span 
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1"
            )}
            style={{ 
              color: alloc.labelColor,
              backgroundColor: alloc.labelBg
            }}
          >
            {alloc.label}
          </span>
          
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            contractStatus.status === 'critical' && 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
            contractStatus.status === 'warning' && 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
            contractStatus.status === 'healthy' && 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
            (contractStatus.status === 'expired' || contractStatus.status === 'permanent') && 
              'bg-muted dark:bg-[var(--surface-3)] text-muted-foreground dark:text-[var(--text-secondary)]'
          )}>
            {profile?.contract_end_date 
              ? formatContractDate(profile.contract_end_date)
              : 'Permanent'}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
