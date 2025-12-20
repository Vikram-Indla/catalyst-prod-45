/**
 * Incident Kanban Types and Utilities
 */

import type { Incident, IncidentStatus, SeverityLevel, SupportLevel } from '@/types/incident';

// Kanban status columns (fixed order, Committee is NOT a status)
export const KANBAN_STATUSES: IncidentStatus[] = [
  'open',
  'triage',
  'in_progress',
  'resolved',
  'closed',
];

// Open statuses (for toggle filter)
export const OPEN_STATUSES: IncidentStatus[] = ['open', 'triage', 'in_progress'];

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

// SLA Health status
export type SlaHealth = 'breached' | 'at_risk' | 'on_track' | 'no_sla';

export const SLA_HEALTH_CONFIG: Record<SlaHealth, { label: string; color: string }> = {
  breached: { label: 'Breached', color: 'hsl(var(--destructive))' },
  at_risk: { label: 'At Risk', color: 'hsl(var(--warning))' },
  on_track: { label: 'On Track', color: 'hsl(var(--g300))' },
  no_sla: { label: 'No SLA', color: 'var(--text-3)' },
};

// Age bucket
export type AgeBucket = '0-1d' | '2-3d' | '4-7d' | '8d+';

export const AGE_BUCKET_CONFIG: Record<AgeBucket, { label: string; minDays: number; maxDays: number }> = {
  '0-1d': { label: '0–1 day', minDays: 0, maxDays: 1 },
  '2-3d': { label: '2–3 days', minDays: 2, maxDays: 3 },
  '4-7d': { label: '4–7 days', minDays: 4, maxDays: 7 },
  '8d+': { label: '8+ days', minDays: 8, maxDays: Infinity },
};

// Group-by options
export type GroupByOption = 'none' | 'severity' | 'sla_health' | 'level' | 'assignee' | 'age';

export const GROUP_BY_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'severity', label: 'Severity' },
  { value: 'sla_health', label: 'SLA Health' },
  { value: 'level', label: 'Level' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'age', label: 'Age Buckets' },
];

// Swimlane group
export interface SwimlaneGroup {
  key: string;
  label: string;
  color?: string;
  order: number;
  incidents: Incident[];
}

// Column stats
export interface ColumnStats {
  total: number;
  atRisk: number;
  breached: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate SLA health for an incident
 */
export function getSlaHealth(incident: Incident): SlaHealth {
  const sla = incident.sla;
  if (!sla) return 'no_sla';
  
  const now = new Date();
  
  // Check if breached
  if (sla.resolution_breached || sla.response_breached) {
    return 'breached';
  }
  
  // Check if at risk (within 2 hours of resolution deadline)
  if (sla.resolution_due_at) {
    const dueAt = new Date(sla.resolution_due_at);
    const hoursRemaining = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursRemaining <= 2 && hoursRemaining > 0) {
      return 'at_risk';
    }
  }
  
  return 'on_track';
}

/**
 * Calculate age in days
 */
export function getAgeDays(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get age bucket for an incident
 */
export function getAgeBucket(createdAt: string): AgeBucket {
  const days = getAgeDays(createdAt);
  if (days <= 1) return '0-1d';
  if (days <= 3) return '2-3d';
  if (days <= 7) return '4-7d';
  return '8d+';
}

/**
 * Calculate time in current status
 */
export function getTimeInStatus(incident: Incident): string {
  // Use updated_at as a proxy for last status change
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
 * Group incidents into swimlanes
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

  const groups: Map<string, SwimlaneGroup> = new Map();

  incidents.forEach(incident => {
    let key: string;
    let label: string;
    let color: string | undefined;
    let order: number;

    switch (groupBy) {
      case 'severity':
        key = incident.severity;
        label = incident.severity;
        order = ['SEV1', 'SEV2', 'SEV3', 'SEV4'].indexOf(key);
        color = key === 'SEV1' ? 'hsl(var(--destructive))' : 
                key === 'SEV2' ? 'hsl(var(--warning))' :
                key === 'SEV3' ? 'hsl(var(--b400))' : 'var(--text-3)';
        break;

      case 'sla_health':
        const health = getSlaHealth(incident);
        key = health;
        label = SLA_HEALTH_CONFIG[health].label;
        color = SLA_HEALTH_CONFIG[health].color;
        order = ['breached', 'at_risk', 'on_track', 'no_sla'].indexOf(key);
        break;

      case 'level':
        key = incident.support_level || 'none';
        label = incident.support_level || '—';
        order = ['L1', 'L2', 'L3', 'none'].indexOf(key);
        break;

      case 'assignee':
        if (incident.assignee) {
          key = incident.assignee.id;
          label = incident.assignee.full_name;
          order = 0; // Will sort alphabetically
        } else {
          key = 'unassigned';
          label = 'Unassigned';
          order = 999;
        }
        break;

      case 'age':
        const bucket = getAgeBucket(incident.created_at);
        key = bucket;
        label = AGE_BUCKET_CONFIG[bucket].label;
        order = ['0-1d', '2-3d', '4-7d', '8d+'].indexOf(key);
        break;

      default:
        key = 'all';
        label = 'All';
        order = 0;
    }

    if (!groups.has(key)) {
      groups.set(key, { key, label, color, order, incidents: [] });
    }
    groups.get(key)!.incidents.push(incident);
  });

  // Sort groups by order
  return Array.from(groups.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.label.localeCompare(b.label);
  });
}

/**
 * Calculate column stats
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
