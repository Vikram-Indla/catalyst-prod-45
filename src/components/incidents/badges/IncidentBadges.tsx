import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { IncidentStatus, SeverityLevel, PriorityLevel, SupportLevel } from '@/types/incident';

// ============================================
// SHARED BADGE TOKENS - SINGLE SOURCE OF TRUTH
// Used across: List, Detail, Dashboard, etc.
// ============================================

// STATUS - Brand-aligned teal/cyan tones for dark mode
export const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800' },
  triage: { label: 'Triaging', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  to_committee: { label: 'Committee', className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800' },
  in_progress: { label: 'In Progress', className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800' },
  resolved: { label: 'Resolved', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  converted: { label: 'Converted', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
};

// SEVERITY - Brand colors with dots indicator style
export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; className: string; dotColor: string }> = {
  SEV1: { label: 'SEV1', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800', dotColor: 'bg-red-500' },
  SEV2: { label: 'SEV2', className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800', dotColor: 'bg-orange-500' },
  SEV3: { label: 'SEV3', className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800', dotColor: 'bg-green-500' },
  SEV4: { label: 'SEV4', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', dotColor: 'bg-gray-400' },
};

// PRIORITY - Derived, brand-aligned tones
export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; fullLabel: string; className: string }> = {
  P1: { label: 'P1', fullLabel: 'P1 — Critical', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
  P2: { label: 'P2', fullLabel: 'P2 — High', className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' },
  P3: { label: 'P3', fullLabel: 'P3 — Medium', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  P4: { label: 'P4', fullLabel: 'P4 — Low', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
};

// SUPPORT LEVEL - Neutral enterprise tones
export const SUPPORT_LEVEL_CONFIG: Record<SupportLevel, { label: string; className: string }> = {
  L1: { label: 'L1', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
  L2: { label: 'L2', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' },
  L3: { label: 'L3', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' },
};

// ============================================
// BADGE COMPONENTS
// ============================================

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'xs' | 'sm';
}

export function StatusBadge({ status, size = 'xs' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  const dotColor = status === 'in_progress' || status === 'to_committee' || status === 'open' 
    ? 'bg-cyan-500' 
    : status === 'triage' || status === 'resolved'
    ? 'bg-amber-500'
    : 'bg-gray-400';
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium px-1.5 py-0 whitespace-nowrap flex items-center gap-1',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        config.className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
      {config.label}
    </Badge>
  );
}

interface SeverityBadgeProps {
  severity: SeverityLevel;
  size?: 'xs' | 'sm';
}

export function SeverityBadge({ severity, size = 'xs' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium px-1.5 py-0 border flex items-center gap-1',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        config.className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: PriorityLevel | null | undefined;
  size?: 'xs' | 'sm';
}

export function PriorityBadge({ priority, size = 'xs' }: PriorityBadgeProps) {
  if (!priority) return <span className="text-muted-foreground text-xs">-</span>;
  
  const config = PRIORITY_CONFIG[priority];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium px-1.5 py-0 border',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        config.className
      )}
    >
      {config.label}
    </Badge>
  );
}

interface SupportLevelBadgeProps {
  level: SupportLevel | string | null | undefined;
  size?: 'xs' | 'sm';
}

export function SupportLevelBadge({ level, size = 'xs' }: SupportLevelBadgeProps) {
  if (!level) return <span className="text-muted-foreground text-xs">-</span>;
  
  const config = SUPPORT_LEVEL_CONFIG[level as SupportLevel];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium px-1.5 py-0 border',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        config.className
      )}
    >
      {config.label}
    </Badge>
  );
}

// ============================================
// SLA BADGE COMPONENT
// ============================================

export type SlaStatus = 'on_track' | 'at_risk' | 'breached';

interface SlaBadgeProps {
  status: SlaStatus;
  size?: 'xs' | 'sm';
}

const SLA_CONFIG: Record<SlaStatus, { label: string; className: string; Icon: typeof CheckCircle }> = {
  on_track: { 
    label: 'On Track', 
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
    Icon: CheckCircle 
  },
  at_risk: { 
    label: 'At Risk', 
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    Icon: AlertTriangle 
  },
  breached: { 
    label: 'Breached', 
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    Icon: AlertTriangle 
  },
};

export function SlaBadge({ status, size = 'xs' }: SlaBadgeProps) {
  const config = SLA_CONFIG[status];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  const { Icon } = config;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium px-1.5 py-0 border flex items-center gap-1',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        config.className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getAgingTime(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}