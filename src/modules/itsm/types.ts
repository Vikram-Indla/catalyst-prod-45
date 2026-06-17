// ============================================================
// ITSM INCIDENT MANAGEMENT — TYPE DEFINITIONS
// Net-new, isolated module. Mirrors itsm_* DB schema (snake) -> camel.
// ============================================================

import type { PriorityLevel } from '@/components/shared/PriorityIcon';

export type ItsmStatus =
  | 'triage'
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved'
  | 'closed';

export type ItsmStatusCategory = 'todo' | 'in_progress' | 'done';

export type ItsmSeverity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';

// Priority reuses the canonical PriorityIcon range so the shared glyph renders directly.
export type ItsmPriority = PriorityLevel; // 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest'

export type ItsmMemberRole = 'responder' | 'watcher' | 'commander';

export type ItsmTimelineEvent =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'resolved'
  | 'closed'
  | 'note';

export interface ItsmIncident {
  id: string;
  incidentKey: string;
  title: string;
  description: string | null;
  status: ItsmStatus;
  severity: ItsmSeverity;
  priority: ItsmPriority;
  affectedService: string | null;
  assigneeId: string | null;
  reporterId: string | null;
  slaPolicyId: string | null;
  responseDueAt: string | null;
  resolveDueAt: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItsmSlaPolicy {
  id: string;
  name: string;
  priority: ItsmPriority;
  responseMinutes: number;
  resolveMinutes: number;
  isActive: boolean;
}

export interface ItsmIncidentMember {
  id: string;
  incidentId: string;
  userId: string;
  role: ItsmMemberRole;
}

export interface ItsmStatusHistoryEntry {
  id: string;
  incidentId: string;
  fromStatus: ItsmStatus | null;
  toStatus: ItsmStatus;
  changedBy: string | null;
  changedAt: string;
}

export interface ItsmTimelineEntry {
  id: string;
  incidentId: string;
  eventType: ItsmTimelineEvent;
  detail: string | null;
  actorId: string | null;
  createdAt: string;
}

// SLA evaluation
export type SlaState = 'ok' | 'at_risk' | 'breached' | 'met';

export interface SlaTargets {
  responseDueAt: string; // ISO
  resolveDueAt: string; // ISO
}

// System Insights (deterministic — NOT AI)
export type InsightSeverity = 'critical' | 'warning' | 'info';

export interface SystemInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  metric: number;
  source: 'System Insight';
}
