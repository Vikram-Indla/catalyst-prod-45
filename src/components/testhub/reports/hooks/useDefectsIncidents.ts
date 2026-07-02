/**
 * useDefectsIncidents — real-data hook for the Defect Summary report (B1 group 6, hybrid D-005).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 *
 * Defects = ph_issues 'QA Bug'/'Defect' + tm_defects (test-linked).
 * Phase 2 Lane C (CAT-REPORTS-HUB-20260703-001): the incident half (Production
 * Incident counts, open-incident rows, regression gap) moved to the Incident Hub
 * report — see src/modules/incidents/analytics/hooks/useIncidentReport.ts.
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
  tmDefects: number;
  openDefects: IssueRow[];
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

      const tmDef = await supabase.from('tm_defects').select('id', { count: 'exact', head: true }).eq('project_id', projectId!);

      return {
        defectsTotal: defects.length,
        defectsOpen: defects.filter((d) => isOpen(d.status_category)).length,
        tmDefects: tmDef.count ?? 0,
        openDefects: defects.filter((d) => isOpen(d.status_category)).slice(0, 100),
      };
    },
  });
}
