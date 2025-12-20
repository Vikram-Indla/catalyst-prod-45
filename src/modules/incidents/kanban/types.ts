/**
 * Incident Kanban Types and Utilities
 * Lane rules match Analytics/Insights for consistent counts
 */

import type { Incident, IncidentStatus, SeverityLevel, SupportLevel, SlaRecord } from '@/types/incident';

// Kanban status columns (fixed order, Committee is NOT a status)
export const KANBAN_STATUSES: IncidentStatus[] = [
  'open',
  'triage',
  'in_progress',
  'resolved',
  'closed',
];

// Required columns that cannot be removed
export const REQUIRED_COLUMNS: IncidentStatus[] = [
  'open',
  'triage',
  'in_progress',
  'resolved',
  'closed',
];

// Statuses that can NEVER be added as columns
export const FORBIDDEN_COLUMNS: IncidentStatus[] = [
  'to_committee', // Committee is never a column
  'converted',    // Converted is a terminal state, not a workflow column
];

// Open statuses (for toggle filter)
export const OPEN_STATUSES: IncidentStatus[] = ['open', 'triage', 'in_progress'];

// Resolved/Closed statuses (for SLA checks)
export const RESOLVED_STATUSES: IncidentStatus[] = ['resolved', 'closed'];

// Status display config
export const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'hsl(var(--b400))' },
  triage: { label: 'Triage', color: 'hsl(var(--y300))' },
  in_progress: { label: 'In Progress', color: 'hsl(var(--p300))' },
  to_committee: { label: 'Committee', color: 'hsl(var(--secondary-bronze))' },
  resolved: { label: 'Resolved', color: 'hsl(var(--g300))' },
  converted: { label: 'Converted', color: 'hsl(var(--info))' },
  closed: { label: 'Closed', color: 'var(--text-3)' },
};

// ============================================================================
// SLA HEALTH
// ============================================================================

export type SlaHealth = 'breached' | 'at_risk' | 'on_track' | 'no_sla';

export const SLA_HEALTH_ORDER: SlaHealth[] = ['breached', 'at_risk', 'on_track', 'no_sla'];

export const SLA_HEALTH_CONFIG: Record<SlaHealth, { label: string; color: string }> = {
  breached: { label: 'Breached', color: 'hsl(var(--destructive))' },
  at_risk: { label: 'At Risk', color: 'hsl(var(--warning))' },
  on_track: { label: 'On Track', color: 'hsl(var(--g300))' },
  no_sla: { label: 'No SLA', color: 'var(--text-3)' },
};

/**
 * Calculate SLA health for an incident
 * Rules:
 * - No SLA: severity = SEV4 OR SLA duration is null/disabled
 * - Breached: now > created_at + sla_duration AND status not in [Resolved, Closed]
 * - At Risk: remaining SLA time <= 20% of sla_duration AND status not in [Resolved, Closed]
 * - On Track: all other cases
 */
export function getSlaHealth(incident: Incident): SlaHealth {
  // SEV4 incidents have no SLA
  if (incident.severity === 'SEV4') {
    return 'no_sla';
  }

  const sla = incident.sla;
  
  // No SLA record = no SLA
  if (!sla || !sla.resolution_due_at) {
    return 'no_sla';
  }

  // Already resolved/closed - show final status
  if (RESOLVED_STATUSES.includes(incident.status)) {
    // If it was breached, show breached
    if (sla.resolution_breached) {
      return 'breached';
    }
    return 'on_track';
  }

  const now = new Date();
  const dueAt = new Date(sla.resolution_due_at);
  const createdAt = new Date(incident.created_at);
  
  // Calculate total SLA duration (due_at - created_at)
  const totalDuration = dueAt.getTime() - createdAt.getTime();
  const remaining = dueAt.getTime() - now.getTime();

  // Breached: now > due date
  if (remaining < 0) {
    return 'breached';
  }

  // At Risk: remaining time <= 20% of total duration
  const atRiskThreshold = totalDuration * 0.2;
  if (remaining <= atRiskThreshold) {
    return 'at_risk';
  }

  return 'on_track';
}

// ============================================================================
// AGE BUCKETS
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
export function getAgeDays(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get age bucket for an incident
 * Based on now - created_at
 */
export function getAgeBucket(createdAt: string): AgeBucket {
  const days = getAgeDays(createdAt);
  if (days <= 1) return '0-1d';
  if (days <= 3) return '2-3d';
  if (days <= 7) return '4-7d';
  return '8d+';
}

// ============================================================================
// SEVERITY / LEVEL LANES
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
// GROUP BY OPTIONS
// ============================================================================

export type GroupByOption = 'none' | 'severity' | 'sla_health' | 'level' | 'assignee' | 'age';

export const GROUP_BY_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'severity', label: 'Severity' },
  { value: 'sla_health', label: 'SLA Health' },
  { value: 'level', label: 'Level' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'age', label: 'Age Buckets' },
];

// ============================================================================
// SWIMLANE TYPES
// ============================================================================

export interface SwimlaneGroup {
  key: string;
  label: string;
  color?: string;
  order: number;
  incidents: Incident[];
}

export interface ColumnStats {
  total: number;
  atRisk: number;
  breached: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate time in current status
 */
export function getTimeInStatus(incident: Incident): string {
  const lastChange = new Date(incident.updated_at);
  const now = new Date();
  const hours = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60));
  
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Format age for display
 */
export function formatAge(createdAt: string): string {
  const days = getAgeDays(createdAt);
  if (days === 0) return 'Today';
  if (days === 1) return '1d';
  return `${days}d`;
}

/**
 * Group incidents into swimlanes with FIXED lane orders
 * Each incident appears in exactly one lane
 */
export function groupIncidents(
  incidents: Incident[],
  groupBy: GroupByOption
): SwimlaneGroup[] {
  if (groupBy === 'none') {
    return [{
      key: 'all',
      label: 'All Incidents',
      order: 0,
      incidents,
    }];
  }

  switch (groupBy) {
    case 'severity':
      return groupBySeverity(incidents);
    case 'sla_health':
      return groupBySlaHealth(incidents);
    case 'level':
      return groupByLevel(incidents);
    case 'assignee':
      return groupByAssignee(incidents);
    case 'age':
      return groupByAge(incidents);
    default:
      return [{ key: 'all', label: 'All', order: 0, incidents }];
  }
}

/**
 * GROUP BY: Severity
 * Lane order: SEV1, SEV2, SEV3, SEV4
 */
function groupBySeverity(incidents: Incident[]): SwimlaneGroup[] {
  const lanes: SwimlaneGroup[] = SEVERITY_ORDER.map((sev, idx) => ({
    key: sev,
    label: SEVERITY_CONFIG[sev].label,
    color: SEVERITY_CONFIG[sev].color,
    order: idx,
    incidents: [],
  }));

  const laneMap = new Map(lanes.map(l => [l.key, l]));

  incidents.forEach(incident => {
    laneMap.get(incident.severity)?.incidents.push(incident);
  });

  return lanes;
}

/**
 * GROUP BY: SLA Health
 * Lane order: Breached, At Risk, On Track, No SLA
 */
function groupBySlaHealth(incidents: Incident[]): SwimlaneGroup[] {
  const lanes: SwimlaneGroup[] = SLA_HEALTH_ORDER.map((health, idx) => ({
    key: health,
    label: SLA_HEALTH_CONFIG[health].label,
    color: SLA_HEALTH_CONFIG[health].color,
    order: idx,
    incidents: [],
  }));

  const laneMap = new Map(lanes.map(l => [l.key, l]));

  incidents.forEach(incident => {
    const health = getSlaHealth(incident);
    laneMap.get(health)?.incidents.push(incident);
  });

  return lanes;
}

/**
 * GROUP BY: Level
 * Lane order: L1, L2, L3, —
 */
function groupByLevel(incidents: Incident[]): SwimlaneGroup[] {
  const lanes: SwimlaneGroup[] = LEVEL_ORDER.map((level, idx) => ({
    key: level,
    label: LEVEL_CONFIG[level].label,
    color: LEVEL_CONFIG[level].color,
    order: idx,
    incidents: [],
  }));

  const laneMap = new Map(lanes.map(l => [l.key, l]));

  incidents.forEach(incident => {
    const level = incident.support_level || 'none';
    laneMap.get(level)?.incidents.push(incident);
  });

  return lanes;
}

/**
 * GROUP BY: Assignee
 * Lane order:
 *   1) Unassigned
 *   2) Top 6 assignees by count
 *   3) "Other" (everyone else)
 */
function groupByAssignee(incidents: Incident[]): SwimlaneGroup[] {
  // Count incidents per assignee
  const assigneeCounts = new Map<string, { id: string; name: string; count: number }>();
  const unassignedIncidents: Incident[] = [];
  const assignedIncidents: Incident[] = [];

  incidents.forEach(incident => {
    if (!incident.assignee_id || !incident.assignee) {
      unassignedIncidents.push(incident);
    } else {
      assignedIncidents.push(incident);
      const id = incident.assignee_id;
      const existing = assigneeCounts.get(id);
      if (existing) {
        existing.count++;
      } else {
        assigneeCounts.set(id, {
          id,
          name: incident.assignee.full_name,
          count: 1,
        });
      }
    }
  });

  // Sort assignees by count (desc) and take top 6
  const sortedAssignees = Array.from(assigneeCounts.values())
    .sort((a, b) => b.count - a.count);
  
  const top6 = sortedAssignees.slice(0, 6);
  const top6Ids = new Set(top6.map(a => a.id));
  const otherAssignees = sortedAssignees.slice(6);

  // Build lanes
  const lanes: SwimlaneGroup[] = [];

  // 1) Unassigned (always first)
  lanes.push({
    key: 'unassigned',
    label: 'Unassigned',
    color: 'var(--text-3)',
    order: 0,
    incidents: unassignedIncidents,
  });

  // 2) Top 6 assignees
  top6.forEach((assignee, idx) => {
    lanes.push({
      key: assignee.id,
      label: assignee.name,
      order: idx + 1,
      incidents: assignedIncidents.filter(i => i.assignee_id === assignee.id),
    });
  });

  // 3) "Other" lane (if there are more assignees)
  if (otherAssignees.length > 0) {
    lanes.push({
      key: 'other',
      label: 'Other',
      color: 'var(--text-3)',
      order: 100,
      incidents: assignedIncidents.filter(i => !top6Ids.has(i.assignee_id!)),
    });
  }

  return lanes;
}

/**
 * GROUP BY: Age Buckets
 * Lane order: 0–1d, 2–3d, 4–7d, 8d+
 */
function groupByAge(incidents: Incident[]): SwimlaneGroup[] {
  const lanes: SwimlaneGroup[] = AGE_BUCKET_ORDER.map((bucket, idx) => ({
    key: bucket,
    label: AGE_BUCKET_CONFIG[bucket].label,
    order: idx,
    incidents: [],
  }));

  const laneMap = new Map(lanes.map(l => [l.key, l]));

  incidents.forEach(incident => {
    const bucket = getAgeBucket(incident.created_at);
    laneMap.get(bucket)?.incidents.push(incident);
  });

  return lanes;
}

/**
 * Calculate column stats (for headers)
 */
export function getColumnStats(incidents: Incident[]): ColumnStats {
  let atRisk = 0;
  let breached = 0;

  incidents.forEach(incident => {
    const health = getSlaHealth(incident);
    if (health === 'at_risk') atRisk++;
    if (health === 'breached') breached++;
  });

  return {
    total: incidents.length,
    atRisk,
    breached,
  };
}
