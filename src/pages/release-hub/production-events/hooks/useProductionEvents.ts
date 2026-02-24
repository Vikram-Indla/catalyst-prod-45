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

/** A grouped production event — one row per parent epic (or standalone ticket) */
export interface ProductionEvent {
  id: string; // parent_key or issue_key for orphans
  title: string; // parent_summary or issue summary
  subtitle: string | null; // short description from first child
  issueType: string; // dominant type
  release: string | null; // first fix_version name
  deployedAt: string; // latest jira_updated_at
  stories: ProductionIssue[]; // child tickets
  parentKey: string | null;
  parentSummary: string | null;
}

/**
 * Fetch ph_issues with status = 'In Production',
 * group by parent_key to create consolidated events.
 */
export function useProductionEvents(periodType: PcPeriodType, periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: ['production-events-grouped', periodType, periodStart, periodEnd],
    queryFn: async (): Promise<ProductionEvent[]> => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, project_key, project_name, issue_type, summary, status, priority, assignee_display_name, parent_key, parent_summary, fix_versions, jira_updated_at, type_icon_url')
        .eq('status', 'In Production')
        .gte('jira_updated_at', `${periodStart}T00:00:00`)
        .lte('jira_updated_at', `${periodEnd}T23:59:59`)
        .order('jira_updated_at', { ascending: false });

      if (error) throw error;
      const issues = (data ?? []) as ProductionIssue[];

      // Group by parent_key (null parents become standalone)
      const groups = new Map<string, ProductionIssue[]>();
      for (const issue of issues) {
        const key = issue.parent_key || `standalone:${issue.issue_key}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(issue);
      }

      const events: ProductionEvent[] = [];
      for (const [key, children] of groups) {
        const isStandalone = key.startsWith('standalone:');
        const first = children[0];
        const latestDate = children.reduce((max, c) =>
          c.jira_updated_at > max ? c.jira_updated_at : max, children[0].jira_updated_at);

        // Find first fix_version name
        let release: string | null = null;
        for (const c of children) {
          if (c.fix_versions?.length > 0 && c.fix_versions[0]?.name) {
            release = c.fix_versions[0].name;
            break;
          }
        }

        // Determine dominant issue type
        const typeCounts: Record<string, number> = {};
        for (const c of children) {
          typeCounts[c.issue_type] = (typeCounts[c.issue_type] || 0) + 1;
        }
        const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];

        events.push({
          id: isStandalone ? first.issue_key : key,
          title: isStandalone ? first.summary : (first.parent_summary || first.summary),
          subtitle: isStandalone ? null : first.summary,
          issueType: dominantType,
          release,
          deployedAt: latestDate,
          stories: children,
          parentKey: isStandalone ? null : first.parent_key,
          parentSummary: isStandalone ? null : first.parent_summary,
        });
      }

      // Sort by deployed date descending
      events.sort((a, b) => b.deployedAt.localeCompare(a.deployedAt));
      return events;
    },
  });
}

export function usePeriodSummary(periodType: PcPeriodType, periodStart: string) {
  return { data: null, isLoading: false };
}
