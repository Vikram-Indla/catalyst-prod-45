import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { IncidentStatus, SeverityLevel, PriorityLevel, SupportLevel } from '@/types/incident';

// ============================================
// CATALYST BRAND PALETTE - Blue + Teal Professional
// Blue #2563eb | Teal #0d9488 | Amber #f59e0b | Red #ef4444 | Gray #6b7280
// ============================================

// STATUS - Updated to Blue + Teal palette
export const STATUS_CONFIG: Record<IncidentStatus, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  open: { 
    label: 'Open', 
    bg: 'rgba(37, 99, 235, 0.1)', 
    text: '#2563eb', 
    border: '#2563eb',
    dotColor: '#2563eb' 
  },
  triage: { 
    label: 'Triaging', 
    bg: 'rgba(245, 158, 11, 0.1)', 
    text: '#b45309', 
    border: 'transparent',
    dotColor: '#f59e0b' 
  },
  to_committee: { 
    label: 'Committee', 
    bg: 'rgba(107, 114, 128, 0.1)', 
    text: '#6b7280', 
    border: 'transparent',
    dotColor: '#6b7280' 
  },
  in_progress: { 
    label: 'In Progress', 
    bg: 'rgba(37, 99, 235, 0.1)', 
    text: '#2563eb', 
    border: 'transparent',
    dotColor: '#2563eb' 
  },
  resolved: { 
    label: 'Resolved', 
    bg: 'rgba(13, 148, 136, 0.1)', 
    text: '#0d9488', 
    border: 'transparent',
    dotColor: '#0d9488' 
  },
  converted: { 
    label: 'Converted', 
    bg: 'rgba(107, 114, 128, 0.1)', 
    text: '#6b7280', 
    border: 'transparent',
    dotColor: '#6b7280' 
  },
  closed: { 
    label: 'Closed', 
    bg: 'rgba(13, 148, 136, 0.1)', 
    text: '#0d9488', 
    border: 'transparent',
    dotColor: '#0d9488' 
  },
};

// SEVERITY - Updated: Red (critical), Amber (high), Blue (medium), Gray (low)
export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; dotColor: string; textColor: string }> = {
  SEV1: { label: 'SEV1', dotColor: '#ef4444', textColor: '#1a1a1a' },  // Red - Critical
  SEV2: { label: 'SEV2', dotColor: '#f59e0b', textColor: '#1a1a1a' },  // Amber - High
  SEV3: { label: 'SEV3', dotColor: '#2563eb', textColor: '#1a1a1a' },  // Blue - Medium
  SEV4: { label: 'SEV4', dotColor: '#6b7280', textColor: '#6b7280' },  // Gray - Low
};

// PRIORITY - Updated to new palette
export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; fullLabel: string; dotColor: string; textColor: string }> = {
  P1: { label: 'P1', fullLabel: 'P1 — Critical', dotColor: '#ef4444', textColor: '#1a1a1a' },
  P2: { label: 'P2', fullLabel: 'P2 — High', dotColor: '#f59e0b', textColor: '#1a1a1a' },
  P3: { label: 'P3', fullLabel: 'P3 — Medium', dotColor: '#2563eb', textColor: '#1a1a1a' },
  P4: { label: 'P4', fullLabel: 'P4 — Low', dotColor: '#6b7280', textColor: '#6b7280' },
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
// SLA BADGE COMPONENT - Teal (on track) / Amber (at risk) / Red (breached)
// ============================================

export type SlaStatus = 'on_track' | 'at_risk' | 'breached';

interface SlaBadgeProps {
  status: SlaStatus;
  size?: 'xs' | 'sm';
}

const SLA_CONFIG: Record<SlaStatus, { label: string; bg: string; text: string; Icon: typeof CheckCircle }> = {
  on_track: { 
    label: 'On Track', 
    bg: 'rgba(13, 148, 136, 0.1)',
    text: '#0d9488',
    Icon: CheckCircle 
  },
  at_risk: { 
    label: 'At Risk', 
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#b45309',
    Icon: AlertTriangle 
  },
  breached: { 
    label: 'Breached', 
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#ef4444',
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
    return 'rgba(239, 68, 68, 0.08)'; // Red at 8% opacity
  }
  return 'transparent';
}