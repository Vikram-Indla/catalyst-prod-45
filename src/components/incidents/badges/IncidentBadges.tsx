import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IncidentStatus, SeverityLevel, PriorityLevel, SupportLevel } from '@/types/incident';

// ============================================
// SHARED BADGE TOKENS - SINGLE SOURCE OF TRUTH
// Used across: List, Detail, Dashboard, etc.
// ============================================

export const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'New', className: 'bg-blue-100 text-blue-800' },
  triage: { label: 'Triage', className: 'bg-yellow-100 text-yellow-800' },
  to_committee: { label: 'To Committee', className: 'bg-purple-100 text-purple-800' },
  in_progress: { label: 'In Progress', className: 'bg-cyan-100 text-cyan-800' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
  converted: { label: 'Converted', className: 'bg-secondary-green/20 text-secondary-green' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
};

export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; className: string }> = {
  SEV1: { label: 'SEV1', className: 'bg-red-100 text-red-800 border-red-200' },
  SEV2: { label: 'SEV2', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  SEV3: { label: 'SEV3', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  SEV4: { label: 'SEV4', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; fullLabel: string; className: string }> = {
  P1: { label: 'P1', fullLabel: 'P1 — Critical', className: 'bg-red-100 text-red-800 border-red-200' },
  P2: { label: 'P2', fullLabel: 'P2 — High', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  P3: { label: 'P3', fullLabel: 'P3 — Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  P4: { label: 'P4', fullLabel: 'P4 — Low', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

export const SUPPORT_LEVEL_CONFIG: Record<SupportLevel, { label: string; className: string }> = {
  L1: { label: 'L1', className: 'bg-green-100 text-green-800 border-green-200' },
  L2: { label: 'L2', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  L3: { label: 'L3', className: 'bg-purple-100 text-purple-800 border-purple-200' },
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
        'font-medium px-1.5 py-0',
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