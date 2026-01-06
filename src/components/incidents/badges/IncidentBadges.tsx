import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { IncidentStatus, SeverityLevel, PriorityLevel, SupportLevel } from '@/types/incident';

// ============================================
// CATALYST BRAND PALETTE - Using Design System Tokens
// Subtle outline-style badges for reduced visual weight
// ============================================

// STATUS - Subtle outline style with semantic token colors
export const STATUS_CONFIG: Record<IncidentStatus, { label: string; variant: 'info' | 'warning' | 'muted' | 'success'; dotColor: string }> = {
  open: { 
    label: 'Open', 
    variant: 'info',
    dotColor: 'hsl(var(--info))' 
  },
  triage: { 
    label: 'Triaging', 
    variant: 'warning',
    dotColor: 'hsl(var(--warning))' 
  },
  to_committee: { 
    label: 'Committee', 
    variant: 'muted',
    dotColor: 'hsl(var(--muted-foreground))' 
  },
  in_progress: { 
    label: 'In Progress', 
    variant: 'info',
    dotColor: 'hsl(var(--info))' 
  },
  resolved: { 
    label: 'Resolved', 
    variant: 'success',
    dotColor: 'hsl(var(--success))' 
  },
  converted: { 
    label: 'Converted', 
    variant: 'muted',
    dotColor: 'hsl(var(--muted-foreground))' 
  },
  closed: { 
    label: 'Closed', 
    variant: 'success',
    dotColor: 'hsl(var(--success))' 
  },
};

// SEVERITY - Using design system tokens
export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; dotColor: string; textClass: string }> = {
  SEV1: { label: 'SEV1', dotColor: 'hsl(var(--danger))', textClass: 'text-foreground' },  // Critical
  SEV2: { label: 'SEV2', dotColor: 'hsl(var(--warning))', textClass: 'text-foreground' },  // High
  SEV3: { label: 'SEV3', dotColor: 'hsl(var(--info))', textClass: 'text-foreground' },  // Medium
  SEV4: { label: 'SEV4', dotColor: 'hsl(var(--muted-foreground))', textClass: 'text-muted-foreground' },  // Low
};

// PRIORITY - Using design system tokens
export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; fullLabel: string; dotColor: string; textClass: string }> = {
  P1: { label: 'P1', fullLabel: 'P1 — Critical', dotColor: 'hsl(var(--danger))', textClass: 'text-foreground' },
  P2: { label: 'P2', fullLabel: 'P2 — High', dotColor: 'hsl(var(--warning))', textClass: 'text-foreground' },
  P3: { label: 'P3', fullLabel: 'P3 — Medium', dotColor: 'hsl(var(--info))', textClass: 'text-foreground' },
  P4: { label: 'P4', fullLabel: 'P4 — Low', dotColor: 'hsl(var(--muted-foreground))', textClass: 'text-muted-foreground' },
};

// SUPPORT LEVEL - Using design system tokens
export const SUPPORT_LEVEL_CONFIG: Record<SupportLevel, { label: string; className: string }> = {
  L1: { label: 'L1', className: 'bg-muted text-muted-foreground border-border' },
  L2: { label: 'L2', className: 'bg-muted text-muted-foreground border-border' },
  L3: { label: 'L3', className: 'bg-muted text-muted-foreground border-border' },
};

// ============================================
// BADGE COMPONENTS
// ============================================

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'xs' | 'sm';
}

// Variant to Tailwind classes mapping - exported for use in other components
export const STATUS_VARIANT_CLASSES = {
  info: 'border-info/30 text-info bg-transparent',
  warning: 'border-warning/30 text-warning bg-transparent',
  success: 'border-success/30 text-success bg-transparent',
  muted: 'border-border text-muted-foreground bg-transparent',
};

export function StatusBadge({ status, size = 'xs' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium border',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        STATUS_VARIANT_CLASSES[config.variant]
      )}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.dotColor }}
      />
      {config.label}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: SeverityLevel;
  size?: 'xs' | 'sm';
}

export function SeverityBadge({ severity, size = 'xs' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  // Dot-only display with text, no background pill
  return (
    <div className={cn(
      'flex items-center gap-2',
      size === 'xs' ? 'text-xs' : 'text-sm'
    )}>
      <span 
        className="w-2 h-2 rounded-full flex-shrink-0" 
        style={{ backgroundColor: config.dotColor }}
      />
      <span className={cn('font-medium', config.textClass)}>
        {config.label}
      </span>
    </div>
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
  
  // Dot-only display like severity
  return (
    <div className={cn(
      'flex items-center gap-2',
      size === 'xs' ? 'text-xs' : 'text-sm'
    )}>
      <span 
        className="w-2 h-2 rounded-full flex-shrink-0" 
        style={{ backgroundColor: config.dotColor }}
      />
      <span className={cn('font-medium', config.textClass)}>
        {config.label}
      </span>
    </div>
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
// SLA BADGE COMPONENT - Teal (on track) / Amber (at risk) / Red (breached)
// ============================================

export type SlaStatus = 'on_track' | 'at_risk' | 'breached';

interface SlaBadgeProps {
  status: SlaStatus;
  size?: 'xs' | 'sm';
}

const SLA_CONFIG: Record<SlaStatus, { label: string; variant: 'success' | 'warning' | 'danger'; Icon: typeof CheckCircle }> = {
  on_track: { 
    label: 'On Track', 
    variant: 'success',
    Icon: CheckCircle 
  },
  at_risk: { 
    label: 'At Risk', 
    variant: 'warning',
    Icon: AlertTriangle 
  },
  breached: { 
    label: 'Breached', 
    variant: 'danger',
    Icon: AlertTriangle 
  },
};

const SLA_VARIANT_CLASSES = {
  success: 'border-success/30 text-success bg-transparent',
  warning: 'border-warning/30 text-warning bg-transparent',
  danger: 'border-danger/30 text-danger bg-transparent',
};

export function SlaBadge({ status, size = 'xs' }: SlaBadgeProps) {
  const config = SLA_CONFIG[status];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  const { Icon } = config;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium border',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        SLA_VARIANT_CLASSES[config.variant]
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
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

// Row background helper for warning states (SEV1 or breached SLA)
export function getIncidentRowBackground(severity: SeverityLevel, slaBreached: boolean): string {
  if (slaBreached || severity === 'SEV1') {
    return 'var(--danger-bg, rgba(239, 68, 68, 0.08))';
  }
  return 'transparent';
}