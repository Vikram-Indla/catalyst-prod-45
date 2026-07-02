/**
 * useIncidentReport — real-data hook for the Incident Hub report (/incident-hub/reports).
 * Feature: CAT-REPORTS-HUB-20260703-001, Phase 2 Lane C (CRE Grid A: Production
 * Incident → INCIDENT module; incident half of the old defects-incidents report).
 *
 * Data contract (PHASE0_DATA_CONTRACT_PROOF.md):
 *  - Native `incidents` table = 0 rows → report runs on ph_issues WHERE
 *    issue_type='Production Incident' (152 rows on staging).
 *  - Incident resolved date = MISSING (changelog empty) → NO MTTR, NO
 *    resolved-trend. Do not compute.
 *  - Regression gap = incidents with no tm_requirement_links.external_key match
 *    (ported from useDefectsIncidents).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const INCIDENT_TYPE = 'Production Incident';

export interface IncidentReportRow {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  priority: string | null;
  jira_created_at: string | null;
}

export interface IncidentPriorityCount {
  /** Priority label; '—' bucket = priority unknown (zero-assumption: dash, never a fabricated default). */
  priority: string;
  count: number;
}

export interface IncidentReport {
  total: number;
  open: number;
  byPriority: IncidentPriorityCount[];
  openIncidents: IncidentReportRow[];
  /** Incidents with no linked regression test (tm_requirement_links.external_key). */
  regressionGap: number;
}

export interface IncidentProjectOption {
  /** project_key */
  value: string;
  /** project_name (falls back to key when name is null) */
  label: string;
}

const isOpen = (statusCategory: string) => statusCategory.toLowerCase() !== 'done';

/** Distinct projects that actually have Production Incidents (filter options). */
export function useIncidentProjectOptions() {
  return useQuery({
    queryKey: ['incident-report-projects'],
    queryFn: async (): Promise<IncidentProjectOption[]> => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('project_key, project_name')
        .eq('issue_type', INCIDENT_TYPE);
      if (error) throw error;
      const seen = new Map<string, string>();
      for (const r of (data ?? []) as { project_key: string; project_name: string | null }[]) {
        if (r.project_key && !seen.has(r.project_key)) {
          seen.set(r.project_key, r.project_name ?? r.project_key);
        }
      }
      return [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Production-incident report totals + open rows + regression gap. Throws on error. */
export function useIncidentReport(projectKey?: string) {
  return useQuery({
    queryKey: ['incident-report', projectKey ?? 'all'],
    queryFn: async (): Promise<IncidentReport> => {
      let query = supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, priority, jira_created_at')
        .eq('issue_type', INCIDENT_TYPE)
        .order('jira_created_at', { ascending: false, nullsFirst: false });
      if (projectKey) query = query.eq('project_key', projectKey);
      const { data, error } = await query;
      if (error) throw error;
      const incidents = (data ?? []) as IncidentReportRow[];

      // Regression coverage: incidents with a linked test (tm_requirement_links.external_key).
      let linkedIncidents = 0;
      const incidentKeys = incidents.map((i) => i.issue_key);
      if (incidentKeys.length) {
        const { data: links, error: linksError } = await supabase
          .from('tm_requirement_links')
          .select('external_key')
          .in('external_key', incidentKeys);
        if (linksError) throw linksError;
        linkedIncidents = new Set((links ?? []).map((l: { external_key: string }) => l.external_key)).size;
      }

      const byPriorityMap = new Map<string, number>();
      for (const i of incidents) {
        const bucket = i.priority ?? '—';
        byPriorityMap.set(bucket, (byPriorityMap.get(bucket) ?? 0) + 1);
      }

      const open = incidents.filter((i) => isOpen(i.status_category));

      return {
        total: incidents.length,
        open: open.length,
        byPriority: [...byPriorityMap.entries()]
          .map(([priority, count]) => ({ priority, count }))
          .sort((a, b) => b.count - a.count),
        openIncidents: open.slice(0, 100),
        regressionGap: incidents.length - linkedIncidents,
      };
    },
  });
}
