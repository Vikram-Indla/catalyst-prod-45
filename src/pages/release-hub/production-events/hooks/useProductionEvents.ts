import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PcPeriodType } from '../types/production-events.types';

export interface ProductionIssue {
  issue_key: string;
  project_key: string;
  project_name: string | null;
  issue_type: string;
  summary: string;
  status: string;
  priority: string | null;
  assignee_display_name: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  fix_versions: any[];
  jira_updated_at: string;
  type_icon_url: string | null;
}

/**
 * Fetch ph_issues with status = 'In Production'
 * filtered by jira_updated_at within the given period range.
 */
export function useProductionEvents(periodType: PcPeriodType, periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: ['production-issues', periodType, periodStart, periodEnd],
    queryFn: async (): Promise<ProductionIssue[]> => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, project_key, project_name, issue_type, summary, status, priority, assignee_display_name, parent_key, parent_summary, fix_versions, jira_updated_at, type_icon_url')
        .eq('status', 'In Production')
        .gte('jira_updated_at', `${periodStart}T00:00:00`)
        .lte('jira_updated_at', `${periodEnd}T23:59:59`)
        .order('jira_updated_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as ProductionIssue[];
    },
  });
}

export function usePeriodSummary(periodType: PcPeriodType, periodStart: string) {
  // No longer using pc_period_summaries — return null
  return { data: null, isLoading: false };
}
