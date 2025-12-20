/**
 * Incident Kanban Types and Utilities
 * Re-exports shared computations for backward compatibility
 */

import type { Incident, IncidentStatus, SeverityLevel, SupportLevel } from '@/types/incident';

// Re-export all shared computations
export {
  // SLA
  type SlaHealthState as SlaHealth,
  SLA_HEALTH_ORDER,
  SLA_HEALTH_CONFIG,
  type SLAConfig,
  DEFAULT_SLA_CONFIG,
  computeSlaHealth as getSlaHealth,
  
  // Age
  type AgeBucket,
  AGE_BUCKET_ORDER,
  AGE_BUCKET_CONFIG,
  computeAgeDays as getAgeDays,
  computeAgeHours,
  computeAgeBucket as getAgeBucket,
  formatAge,
  computeTimeInStatus as getTimeInStatus,
  
  // Quick Filters
  type QuickFilterKey,
  type QuickFilterConfig,
  QUICK_FILTERS,
  applyQuickFilters,
  
  // Stats
  type ColumnStats,
  computeColumnStats as getColumnStats,
  
  // Severity/Level
  SEVERITY_ORDER,
  SEVERITY_CONFIG,
  LEVEL_ORDER,
  LEVEL_CONFIG,
  
  // Status
  KANBAN_STATUSES,
  OPEN_STATUSES,
  RESOLVED_STATUSES,
  STATUS_CONFIG,
} from '../shared/computations';

// ============================================================================
// COLUMN CONFIGURATION
// ============================================================================

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
  'converted',    // Converted is a terminal state
];

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

// ============================================================================
// GROUPING FUNCTIONS (import shared utilities)
// ============================================================================

import {
  computeSlaHealth,
  computeAgeBucket,
  SLA_HEALTH_ORDER,
  SLA_HEALTH_CONFIG,
  AGE_BUCKET_ORDER,
  AGE_BUCKET_CONFIG,
  SEVERITY_ORDER,
  SEVERITY_CONFIG,
  LEVEL_ORDER,
  LEVEL_CONFIG,
  type SLAConfig,
  DEFAULT_SLA_CONFIG,
} from '../shared/computations';

/**
 * Group incidents into swimlanes with FIXED lane orders
 * Each incident appears in exactly one lane
 */
export function groupIncidents(
  incidents: Incident[],
  groupBy: GroupByOption,
  slaConfig?: SLAConfig
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
      return groupBySlaHealth(incidents, slaConfig);
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
function groupBySlaHealth(incidents: Incident[], slaConfig?: SLAConfig): SwimlaneGroup[] {
  const lanes: SwimlaneGroup[] = SLA_HEALTH_ORDER.map((health, idx) => ({
    key: health,
    label: SLA_HEALTH_CONFIG[health].label,
    color: SLA_HEALTH_CONFIG[health].color,
    order: idx,
    incidents: [],
  }));

  const laneMap = new Map(lanes.map(l => [l.key, l]));

  incidents.forEach(incident => {
    const health = computeSlaHealth(incident, slaConfig || DEFAULT_SLA_CONFIG);
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
 * Lane order: Unassigned, Top 6, Other
 */
function groupByAssignee(incidents: Incident[]): SwimlaneGroup[] {
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

  const sortedAssignees = Array.from(assigneeCounts.values())
    .sort((a, b) => b.count - a.count);
  
  const top6 = sortedAssignees.slice(0, 6);
  const top6Ids = new Set(top6.map(a => a.id));
  const otherAssignees = sortedAssignees.slice(6);

  const lanes: SwimlaneGroup[] = [];

  lanes.push({
    key: 'unassigned',
    label: 'Unassigned',
    color: 'var(--text-3)',
    order: 0,
    incidents: unassignedIncidents,
  });

  top6.forEach((assignee, idx) => {
    lanes.push({
      key: assignee.id,
      label: assignee.name,
      order: idx + 1,
      incidents: assignedIncidents.filter(i => i.assignee_id === assignee.id),
    });
  });

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
    const bucket = computeAgeBucket(incident.created_at);
    laneMap.get(bucket)?.incidents.push(incident);
  });

  return lanes;
}
