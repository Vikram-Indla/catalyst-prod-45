import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IncidentStatus, SeverityLevel, PriorityLevel, SupportLevel } from '@/types/incident';

// ============================================
// SHARED BADGE TOKENS - SINGLE SOURCE OF TRUTH
// Used across: List, Detail, Dashboard, etc.
// ============================================

// STATUS - Enterprise muted tones, no saturated colors
export const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'New', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  triage: { label: 'Triage', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  to_committee: { label: 'To Committee', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  in_progress: { label: 'In Progress', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  resolved: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  converted: { label: 'Converted', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
};

// SEVERITY - Restrained enterprise tones (no bright reds/yellows)
export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; className: string }> = {
  SEV1: { label: 'SEV1', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  SEV2: { label: 'SEV2', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  SEV3: { label: 'SEV3', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  SEV4: { label: 'SEV4', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

// PRIORITY - Derived, muted enterprise tones
export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; fullLabel: string; className: string }> = {
  P1: { label: 'P1', fullLabel: 'P1 — Critical', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  P2: { label: 'P2', fullLabel: 'P2 — High', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  P3: { label: 'P3', fullLabel: 'P3 — Medium', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  P4: { label: 'P4', fullLabel: 'P4 — Low', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

// SUPPORT LEVEL - Neutral enterprise tones
export const SUPPORT_LEVEL_CONFIG: Record<SupportLevel, { label: string; className: string }> = {
  L1: { label: 'L1', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  L2: { label: 'L2', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  L3: { label: 'L3', className: 'bg-violet-50 text-violet-700 border-violet-200' },
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
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium px-1.5 py-0 whitespace-nowrap',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        config.className
      )}
    >
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
        'font-medium px-1.5 py-0 border',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        config.className
      )}
    >
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