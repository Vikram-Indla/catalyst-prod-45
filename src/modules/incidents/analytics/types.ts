/**
 * Incident Analytics Types
 */

export type TimeRange = 'today' | '24h' | '7d' | '30d' | 'custom';

export type InsightPeriod = 'today' | 'this_week' | 'last_week';

export interface SLAPolicy {
  severity: 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
  resolution_hours: number | null; // null = no SLA
}

export interface SLAState {
  state: 'on_track' | 'at_risk' | 'breached' | 'n_a' | 'met';
  remaining_hours?: number;
  due_at?: string;
}

export interface IncidentWithSLA {
  id: string;
  incident_key: string;
  title: string;
  severity: 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
  support_level: 'L1' | 'L2' | 'L3' | null;
  status: string;
  is_major_incident: boolean;
  created_at: string;
  resolved_at: string | null;
  assignee_name?: string;
  assignee_workgroup?: { name: string };
  sla_state: SLAState;
  age_hours: number;
}

export interface AnalyticsSnapshot {
  open: number;
  major_active: number;
  sla_breached: number;
  sla_at_risk: number;
  committee: number;
}

export interface PeriodMetrics {
  created: number;
  resolved: number;
  backlog_delta: number;
  sla_breached: number;
  sla_at_risk: number;
  major_active: number;
}

export interface PeriodComparison {
  created: number;
  resolved: number;
  backlog_delta: number;
  sla_breached: number;
  sla_at_risk: number;
  major_active: number;
}

export interface BreakdownData {
  severity: Record<string, number>;
  level: Record<string, number>;
  status: Record<string, number>;
  sla_state: Record<string, number>;
}

export interface DrilldownFilter {
  type: 'open' | 'major_active' | 'sla_breached' | 'sla_at_risk' | 'committee' |
        'severity' | 'level' | 'status' | 'sla_state' |
        'created' | 'resolved';
  value?: string;
  label: string;
  periodStart?: Date;
  periodEnd?: Date;
}
