// ============================================================
// ITSM SERVICE — Supabase CRUD for itsm_* tables.
// itsm_* tables are net-new and not yet in generated Database types,
// so we go through typedQuery() (untyped builder). Hooks (1C) wrap these
// in react-query; this layer stays pure data-access + snake->camel mapping.
// ============================================================

import { typedQuery } from '@/integrations/supabase/client';
import type {
  ItsmIncident,
  ItsmSlaPolicy,
  ItsmTimelineEntry,
  ItsmStatusHistoryEntry,
} from '../types';

const INCIDENT_FIELDS =
  'id, incident_key, title, description, status, severity, priority, affected_service, ' +
  'assignee_id, reporter_id, sla_policy_id, response_due_at, resolve_due_at, ' +
  'acknowledged_at, resolved_at, closed_at, created_at, updated_at';

// ---- mappers (snake -> camel) -------------------------------
function mapIncident(r: any): ItsmIncident {
  return {
    id: r.id,
    incidentKey: r.incident_key,
    title: r.title,
    description: r.description ?? null,
    status: r.status,
    severity: r.severity,
    priority: r.priority,
    affectedService: r.affected_service ?? null,
    assigneeId: r.assignee_id ?? null,
    reporterId: r.reporter_id ?? null,
    slaPolicyId: r.sla_policy_id ?? null,
    responseDueAt: r.response_due_at ?? null,
    resolveDueAt: r.resolve_due_at ?? null,
    acknowledgedAt: r.acknowledged_at ?? null,
    resolvedAt: r.resolved_at ?? null,
    closedAt: r.closed_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapSla(r: any): ItsmSlaPolicy {
  return {
    id: r.id,
    name: r.name,
    priority: r.priority,
    responseMinutes: r.response_minutes,
    resolveMinutes: r.resolve_minutes,
    isActive: r.is_active,
  };
}

function mapTimeline(r: any): ItsmTimelineEntry {
  return {
    id: r.id,
    incidentId: r.incident_id,
    eventType: r.event_type,
    detail: r.detail ?? null,
    actorId: r.actor_id ?? null,
    createdAt: r.created_at,
  };
}

function mapStatusHistory(r: any): ItsmStatusHistoryEntry {
  return {
    id: r.id,
    incidentId: r.incident_id,
    fromStatus: r.from_status ?? null,
    toStatus: r.to_status,
    changedBy: r.changed_by ?? null,
    changedAt: r.changed_at,
  };
}

// ---- queries ------------------------------------------------
export async function listIncidents(): Promise<ItsmIncident[]> {
  const { data, error } = await typedQuery('itsm_incidents')
    .select(INCIDENT_FIELDS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapIncident);
}

export async function getIncident(key: string): Promise<ItsmIncident | null> {
  const { data, error } = await typedQuery('itsm_incidents')
    .select(INCIDENT_FIELDS)
    .eq('incident_key', key)
    .maybeSingle();
  if (error) throw error;
  return data ? mapIncident(data) : null;
}

export interface CreateIncidentInput {
  title: string;
  description?: string | null;
  severity?: string;
  priority?: string;
  affectedService?: string | null;
  assigneeId?: string | null;
  reporterId?: string | null;
  slaPolicyId?: string | null;
}

export async function createIncident(input: CreateIncidentInput): Promise<ItsmIncident> {
  const { data, error } = await typedQuery('itsm_incidents')
    .insert({
      title: input.title,
      description: input.description ?? null,
      severity: input.severity ?? 'SEV3',
      priority: input.priority ?? 'Medium',
      affected_service: input.affectedService ?? null,
      assignee_id: input.assigneeId ?? null,
      reporter_id: input.reporterId ?? null,
      sla_policy_id: input.slaPolicyId ?? null,
    })
    .select(INCIDENT_FIELDS)
    .single();
  if (error) throw error;
  return mapIncident(data);
}

export type UpdateIncidentPatch = Partial<{
  title: string;
  description: string | null;
  status: string;
  severity: string;
  priority: string;
  affected_service: string | null;
  assignee_id: string | null;
  response_due_at: string | null;
  resolve_due_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
}>;

export async function updateIncident(id: string, patch: UpdateIncidentPatch): Promise<ItsmIncident> {
  const { data, error } = await typedQuery('itsm_incidents')
    .update(patch)
    .eq('id', id)
    .select(INCIDENT_FIELDS)
    .single();
  if (error) throw error;
  return mapIncident(data);
}

export async function deleteIncident(id: string): Promise<void> {
  const { error } = await typedQuery('itsm_incidents').delete().eq('id', id);
  if (error) throw error;
}

export async function listSlaPolicies(): Promise<ItsmSlaPolicy[]> {
  const { data, error } = await typedQuery('itsm_sla_policies')
    .select('id, name, priority, response_minutes, resolve_minutes, is_active')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map(mapSla);
}

export async function listTimeline(incidentId: string): Promise<ItsmTimelineEntry[]> {
  const { data, error } = await typedQuery('itsm_incident_timeline')
    .select('id, incident_id, event_type, detail, actor_id, created_at')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapTimeline);
}

export async function listStatusHistory(incidentId: string): Promise<ItsmStatusHistoryEntry[]> {
  const { data, error } = await typedQuery('itsm_incident_status_history')
    .select('id, incident_id, from_status, to_status, changed_by, changed_at')
    .eq('incident_id', incidentId)
    .order('changed_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapStatusHistory);
}
