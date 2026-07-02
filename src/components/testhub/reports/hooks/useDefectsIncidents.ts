/**
 * useDefectsIncidents — real-data hook for the Defects & Incidents report (B1 group 6, hybrid D-005).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 *
 * Defects = ph_issues 'QA Bug'/'Defect'; Incidents = 'Production Incident' (real volume) +
 * tm_defects (test-linked). Regression-gap = incidents with no linked test (tm_requirement_links).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IssueRow {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
}

export interface DefectsIncidents {
  defectsTotal: number;
  defectsOpen: number;
  incidentsTotal: number;
  incidentsOpen: number;
  tmDefects: number;
  regressionGap: number;
  openDefects: IssueRow[];
  openIncidents: IssueRow[];
}

const isOpen = (c: string) => c !== 'Done';

export function useDefectsIncidents(projectName?: string, projectId?: string) {
  return useQuery({
    queryKey: ['defects-incidents', projectName, projectId],
    enabled: !!projectName && !!projectId,
    queryFn: async (): Promise<DefectsIncidents> => {
      const { data: defectData } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category')
        .eq('project_name', projectName!)
        .in('issue_type', ['QA Bug', 'Defect'])
        .order('jira_updated_at', { ascending: false, nullsFirst: false });
      const defects = (defectData ?? []) as IssueRow[];

      const { data: incidentData } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category')
        .eq('project_name', projectName!)
        .eq('issue_type', 'Production Incident')
        .order('jira_updated_at', { ascending: false, nullsFirst: false });
      const incidents = (incidentData ?? []) as IssueRow[];

      const tmDef = await supabase.from('tm_defects').select('id', { count: 'exact', head: true }).eq('project_id', projectId!);

      // regression coverage: incidents with a linked test (external_key)
      const incidentKeys = incidents.map((i) => i.issue_key);
      let linkedIncidents = 0;
      if (incidentKeys.length) {
        const { data: links } = await supabase.from('tm_requirement_links').select('external_key').in('external_key', incidentKeys);
        linkedIncidents = new Set((links ?? []).map((l: { external_key: string }) => l.external_key)).size;
      }

      return {
        defectsTotal: defects.length,
        defectsOpen: defects.filter((d) => isOpen(d.status_category)).length,
        incidentsTotal: incidents.length,
        incidentsOpen: incidents.filter((i) => isOpen(i.status_category)).length,
        tmDefects: tmDef.count ?? 0,
        regressionGap: incidents.length - linkedIncidents,
        openDefects: defects.filter((d) => isOpen(d.status_category)).slice(0, 100),
        openIncidents: incidents.filter((i) => isOpen(i.status_category)).slice(0, 100),
      };
    },
  });
}
