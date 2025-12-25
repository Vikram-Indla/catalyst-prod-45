import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { IncidentStatus, SeverityLevel, PriorityLevel, SupportLevel } from '@/types/incident';

// ============================================
// CATALYST BRAND PALETTE (Single Source of Truth)
// Gold #c69c6d | Olive #5c7c5c | Bronze #8b7355 | Champagne #d4b896 | Grey #c8ccd0
// ============================================

// STATUS - Catalyst brand colors (no teal/cyan/lime)
export const STATUS_CONFIG: Record<IncidentStatus, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  open: { 
    label: 'Open', 
    bg: 'rgba(198, 156, 109, 0.08)', 
    text: '#c69c6d', 
    border: '#c69c6d',
    dotColor: '#c69c6d' 
  },
  triage: { 
    label: 'Triaging', 
    bg: 'rgba(139, 115, 85, 0.1)', 
    text: '#8b7355', 
    border: 'transparent',
    dotColor: '#c69c6d' 
  },
  to_committee: { 
    label: 'Committee', 
    bg: 'rgba(200, 204, 208, 0.3)', 
    text: '#6b7280', 
    border: 'transparent',
    dotColor: '#c8ccd0' 
  },
  in_progress: { 
    label: 'In Progress', 
    bg: 'rgba(92, 124, 92, 0.1)', 
    text: '#5c7c5c', 
    border: 'transparent',
    dotColor: '#5c7c5c' 
  },
  resolved: { 
    label: 'Resolved', 
    bg: 'rgba(92, 124, 92, 0.15)', 
    text: '#5c7c5c', 
    border: 'transparent',
    dotColor: '#5c7c5c' 
  },
  converted: { 
    label: 'Converted', 
    bg: 'rgba(200, 204, 208, 0.2)', 
    text: '#6b7280', 
    border: 'transparent',
    dotColor: '#c8ccd0' 
  },
  closed: { 
    label: 'Closed', 
    bg: 'rgba(200, 204, 208, 0.15)', 
    text: '#6b7280', 
    border: 'transparent',
    dotColor: '#c8ccd0' 
  },
};

// SEVERITY - Catalyst brand: Gold (critical), Bronze (high), Olive (medium), Grey (low)
// Dot-only display with text, no background pills
export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; dotColor: string; textColor: string }> = {
  SEV1: { label: 'SEV1', dotColor: '#c69c6d', textColor: '#1a1a1a' },  // Gold - Critical
  SEV2: { label: 'SEV2', dotColor: '#8b7355', textColor: '#1a1a1a' },  // Bronze - High
  SEV3: { label: 'SEV3', dotColor: '#5c7c5c', textColor: '#1a1a1a' },  // Olive - Medium
  SEV4: { label: 'SEV4', dotColor: '#c8ccd0', textColor: '#6b7280' },  // Grey - Low
};

// PRIORITY - Catalyst aligned
export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; fullLabel: string; dotColor: string; textColor: string }> = {
  P1: { label: 'P1', fullLabel: 'P1 — Critical', dotColor: '#c69c6d', textColor: '#1a1a1a' },
  P2: { label: 'P2', fullLabel: 'P2 — High', dotColor: '#8b7355', textColor: '#1a1a1a' },
  P3: { label: 'P3', fullLabel: 'P3 — Medium', dotColor: '#5c7c5c', textColor: '#1a1a1a' },
  P4: { label: 'P4', fullLabel: 'P4 — Low', dotColor: '#c8ccd0', textColor: '#6b7280' },
};

// SUPPORT LEVEL - Neutral grey tones
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
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium',
        size === 'xs' ? 'text-[10px]' : 'text-xs'
      )}
      style={{ 
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text
      }}
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
      <span 
        className="font-medium dark:text-gray-300"
        style={{ color: config.textColor }}
      >
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
      <span 
        className="font-medium dark:text-gray-300"
        style={{ color: config.textColor }}
      >
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
// SLA BADGE COMPONENT - Olive (on track) / Bronze (breached)
// ============================================

export type SlaStatus = 'on_track' | 'at_risk' | 'breached';

interface SlaBadgeProps {
  status: SlaStatus;
  size?: 'xs' | 'sm';
}

const SLA_CONFIG: Record<SlaStatus, { label: string; bg: string; text: string; Icon: typeof CheckCircle }> = {
  on_track: { 
    label: 'On Track', 
    bg: 'rgba(92, 124, 92, 0.12)',
    text: '#5c7c5c',
    Icon: CheckCircle 
  },
  at_risk: { 
    label: 'At Risk', 
    bg: 'rgba(198, 156, 109, 0.12)',
    text: '#c69c6d',
    Icon: AlertTriangle 
  },
  breached: { 
    label: 'Breached', 
    bg: 'rgba(139, 115, 85, 0.12)',
    text: '#8b7355',
    Icon: AlertTriangle 
  },
};

export function SlaBadge({ status, size = 'xs' }: SlaBadgeProps) {
  const config = SLA_CONFIG[status];
  if (!config) return <span className="text-muted-foreground text-xs">-</span>;
  
  const { Icon } = config;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium',
        size === 'xs' ? 'text-[10px]' : 'text-xs'
      )}
      style={{ 
        backgroundColor: config.bg,
        color: config.text
      }}
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
    return 'rgba(212, 184, 150, 0.15)'; // Champagne at 15% opacity
  }
  return 'transparent';
}
