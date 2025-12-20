/**
 * Shared Incident Computation Utilities
 * Used by Kanban, Analytics, and Insights for consistent calculations
 */

import type { Incident, IncidentStatus, SeverityLevel, SupportLevel } from '@/types/incident';

// ============================================================================
// SLA HEALTH CALCULATION (shared across all views)
// ============================================================================

export type SlaHealthState = 'breached' | 'at_risk' | 'on_track' | 'no_sla';

export const SLA_HEALTH_ORDER: SlaHealthState[] = ['breached', 'at_risk', 'on_track', 'no_sla'];

export const SLA_HEALTH_CONFIG: Record<SlaHealthState, { label: string; color: string }> = {
  breached: { label: 'Breached', color: 'hsl(var(--destructive))' },
  at_risk: { label: 'At Risk', color: 'hsl(var(--warning))' },
  on_track: { label: 'On Track', color: 'hsl(var(--g300))' },
  no_sla: { label: 'No SLA', color: 'var(--text-3)' },
};

// Default SLA policies (hours) - same as Analytics
const DEFAULT_SLA_POLICIES: Record<string, number | null> = {
  SEV1: 24,
  SEV2: 48,
  SEV3: 168, // 7 days
  SEV4: null, // No SLA
};

// Major incident override (hours)
const MAJOR_INCIDENT_SLA_HOURS = 4;

// At risk threshold (percentage of remaining time)
const AT_RISK_THRESHOLD = 0.20; // 20%

export interface SLAConfig {
  severity_targets: Record<string, number | null>;
  major_incident_hours: number;
  at_risk_threshold: number;
}

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  severity_targets: DEFAULT_SLA_POLICIES,
  major_incident_hours: MAJOR_INCIDENT_SLA_HOURS,
  at_risk_threshold: AT_RISK_THRESHOLD,
};

/**
 * Calculate SLA health for an incident
 * Uses the SAME logic as Analytics/Insights calculateSLAState
 * 
 * Rules:
 * - No SLA: severity = SEV4 (and not major incident) OR no SLA target
 * - Breached: now > created_at + sla_duration AND status not resolved/closed
 * - At Risk: remaining SLA time <= 20% of sla_duration AND status not resolved/closed
 * - On Track: all other open cases
 */
export function computeSlaHealth(
  incident: Incident,
  config: SLAConfig = DEFAULT_SLA_CONFIG
): SlaHealthState {
  const { severity, is_major_incident, created_at, resolved_at, status } = incident;

  // SEV4 with no major flag has no SLA
  if (severity === 'SEV4' && !is_major_incident) {
    return 'no_sla';
  }

  // Determine SLA target hours
  let targetHours: number;
  if (is_major_incident) {
    targetHours = config.major_incident_hours;
  } else {
    const severityTarget = config.severity_targets[severity];
    if (severityTarget === null || severityTarget === undefined) {
      return 'no_sla';
    }
    targetHours = severityTarget;
  }

  const createdDate = new Date(created_at);
  const dueAt = new Date(createdDate.getTime() + targetHours * 60 * 60 * 1000);
  const now = new Date();

  // If resolved or closed, check if it was breached
  if (resolved_at || status === 'resolved' || status === 'closed') {
    const resolvedDate = resolved_at ? new Date(resolved_at) : now;
    if (resolvedDate <= dueAt) {
      return 'on_track'; // Met SLA
    } else {
      return 'breached'; // Breached SLA
    }
  }

  // For open incidents - check if breached
  if (now > dueAt) {
    return 'breached';
  }

  // Check if at risk (remaining <= 20%)
  const remainingMs = dueAt.getTime() - now.getTime();
  const totalMs = targetHours * 60 * 60 * 1000;
  const remainingRatio = remainingMs / totalMs;

  if (remainingRatio <= config.at_risk_threshold) {
    return 'at_risk';
  }

  return 'on_track';
}

// ============================================================================
// AGE CALCULATION (shared)
// ============================================================================

export type AgeBucket = '0-1d' | '2-3d' | '4-7d' | '8d+';

export const AGE_BUCKET_ORDER: AgeBucket[] = ['0-1d', '2-3d', '4-7d', '8d+'];

export const AGE_BUCKET_CONFIG: Record<AgeBucket, { label: string; minDays: number; maxDays: number }> = {
  '0-1d': { label: '0–1 day', minDays: 0, maxDays: 1 },
  '2-3d': { label: '2–3 days', minDays: 2, maxDays: 3 },
  '4-7d': { label: '4–7 days', minDays: 4, maxDays: 7 },
  '8d+': { label: '8+ days', minDays: 8, maxDays: Infinity },
};

/**
 * Calculate age in days from created_at
 */
export function computeAgeDays(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate age in hours from created_at
 */
export function computeAgeHours(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60);
}

/**
 * Get age bucket for an incident
 */
export function computeAgeBucket(createdAt: string): AgeBucket {
  const days = computeAgeDays(createdAt);
  if (days <= 1) return '0-1d';
  if (days <= 3) return '2-3d';
  if (days <= 7) return '4-7d';
  return '8d+';
}

/**
 * Format age for display
 */
export function formatAge(createdAt: string): string {
  const days = computeAgeDays(createdAt);
  if (days === 0) return 'Today';
  if (days === 1) return '1d';
  return `${days}d`;
}

/**
 * Calculate time in current status
 */
export function computeTimeInStatus(updatedAt: string): string {
  const lastChange = new Date(updatedAt);
  const now = new Date();
  const hours = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60));
  
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ============================================================================
// QUICK FILTER TYPES (shared)
// ============================================================================

export type QuickFilterKey = 
  | 'major' 
  | 'committee' 
  | 'unassigned' 
  | 'sev1' 
  | 'at_risk' 
  | 'breached';

export interface QuickFilterConfig {
  key: QuickFilterKey;
  label: string;
  color?: string;
  match: (incident: Incident, slaConfig?: SLAConfig) => boolean;
}

export const QUICK_FILTERS: QuickFilterConfig[] = [
  {
    key: 'major',
    label: 'Major',
    color: 'hsl(var(--destructive))',
    match: (inc) => inc.is_major_incident,
  },
  {
    key: 'committee',
    label: 'Committee',
    color: 'hsl(var(--secondary-bronze))',
    match: (inc) => inc.requires_committee,
  },
  {
    key: 'unassigned',
    label: 'Unassigned',
    match: (inc) => !inc.assignee_id,
  },
  {
    key: 'sev1',
    label: 'SEV1',
    color: 'hsl(var(--destructive))',
    match: (inc) => inc.severity === 'SEV1',
  },
  {
    key: 'at_risk',
    label: 'At Risk',
    color: 'hsl(var(--warning))',
    match: (inc, cfg) => computeSlaHealth(inc, cfg) === 'at_risk',
  },
  {
    key: 'breached',
    label: 'Breached',
    color: 'hsl(var(--destructive))',
    match: (inc, cfg) => computeSlaHealth(inc, cfg) === 'breached',
  },
];

/**
 * Apply quick filters to incidents
 */
export function applyQuickFilters(
  incidents: Incident[],
  activeFilters: QuickFilterKey[],
  slaConfig?: SLAConfig
): Incident[] {
  if (activeFilters.length === 0) return incidents;
  
  return incidents.filter(inc => {
    // Match ANY of the active filters (OR logic)
    return activeFilters.some(filterKey => {
      const filter = QUICK_FILTERS.find(f => f.key === filterKey);
      return filter?.match(inc, slaConfig);
    });
  });
}

// ============================================================================
// COLUMN STATS (shared)
// ============================================================================

export interface ColumnStats {
  total: number;
  atRisk: number;
  breached: number;
}

/**
 * Calculate column/lane stats
 */
export function computeColumnStats(
  incidents: Incident[],
  slaConfig?: SLAConfig
): ColumnStats {
  let atRisk = 0;
  let breached = 0;

  incidents.forEach(incident => {
    const health = computeSlaHealth(incident, slaConfig);
    if (health === 'at_risk') atRisk++;
    if (health === 'breached') breached++;
  });

  return {
    total: incidents.length,
    atRisk,
    breached,
  };
}

// ============================================================================
// SEVERITY / LEVEL CONFIG (shared)
// ============================================================================

export const SEVERITY_ORDER: SeverityLevel[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];

export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string }> = {
  SEV1: { label: 'SEV1', color: 'hsl(var(--destructive))' },
  SEV2: { label: 'SEV2', color: 'hsl(var(--warning))' },
  SEV3: { label: 'SEV3', color: 'hsl(var(--b400))' },
  SEV4: { label: 'SEV4', color: 'var(--text-3)' },
};

export const LEVEL_ORDER: (SupportLevel | 'none')[] = ['L1', 'L2', 'L3', 'none'];

export const LEVEL_CONFIG: Record<SupportLevel | 'none', { label: string; color: string }> = {
  L1: { label: 'L1', color: 'hsl(var(--destructive))' },
  L2: { label: 'L2', color: 'hsl(var(--warning))' },
  L3: { label: 'L3', color: 'hsl(var(--b400))' },
  none: { label: '—', color: 'var(--text-3)' },
};

// ============================================================================
// STATUS CONFIG (shared)
// ============================================================================

export const KANBAN_STATUSES: IncidentStatus[] = [
  'open',
  'triage',
  'in_progress',
  'resolved',
  'closed',
];

export const OPEN_STATUSES: IncidentStatus[] = ['open', 'triage', 'in_progress'];
export const RESOLVED_STATUSES: IncidentStatus[] = ['resolved', 'closed'];

export const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'hsl(var(--b400))' },
  triage: { label: 'Triage', color: 'hsl(var(--y300))' },
  in_progress: { label: 'In Progress', color: 'hsl(var(--p300))' },
  to_committee: { label: 'Committee', color: 'hsl(var(--secondary-bronze))' },
  resolved: { label: 'Resolved', color: 'hsl(var(--g300))' },
  converted: { label: 'Converted', color: 'hsl(var(--info))' },
  closed: { label: 'Closed', color: 'var(--text-3)' },
};
