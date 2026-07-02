/**
 * Backlog Health adapter — reuses the same scoring engine as Board
 * (computeInsights from useBoardInsights.ts, untouched) but queries ph_issues
 * with the Backlog page's own scope: issue_type allowlist + lifecycle filters,
 * NOT status_category (backlog has no status filter — see useBacklogData.ts).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeInsights, INSIGHTS_SELECT, type RawIssue } from '@/hooks/useBoardInsights';
import type { HealthAttentionItem, HealthKPI, HealthResult } from '../types';

// Mirrors useBacklogData.ts issueTypeFilter — backlog scope by type, not status.
const BACKLOG_ISSUE_TYPES = ['Story', 'Backend', 'Frontend', 'Sub-task', 'Feature', 'QA Bug', 'Production Incident', 'Epic'];
const YEAR_2026_START = '2026-01-01T00:00:00Z';

function toHealthItem(item: ReturnType<typeof computeInsights>['items'][number]): HealthAttentionItem {
  return {
    id: item.id,
    kind: 'issue',
    title: item.title,
    itemKey: item.itemKey,
    type: item.type,
    status: item.status,
    priority: item.priority,
    assignee: item.assigneeId || item.assignee
      ? { id: item.assigneeId, name: item.assignee }
      : null,
    projectKey: item.projectKey,
    dueDate: item.dueDate,
    lastUpdated: item.lastUpdated,
    sprintName: item.sprintName,
    riskBand: item.riskBand,
    attentionScore: item.attentionScore,
    primaryReason: item.primaryReason,
    secondaryReasons: item.secondaryReasons,
    recommendation: item.recommendedAction,
    signals: item.signals,
    daysOverdue: item.daysOverdue,
    staleDays: item.staleDays,
  };
}

function toKPIs(summary: ReturnType<typeof computeInsights>['summary']): HealthKPI[] {
  return [
    { key: 'totalAnalyzed', label: 'Analysed', value: summary.totalAnalyzed, tone: 'neutral' },
    { key: 'attentionCount', label: 'Attention', value: summary.attentionCount, tone: summary.attentionCount > 0 ? 'warning' : 'neutral' },
    { key: 'criticalCount', label: 'Critical', value: summary.criticalCount, tone: summary.criticalCount > 0 ? 'danger' : 'neutral' },
    { key: 'overdueCount', label: 'Overdue', value: summary.overdueCount, tone: summary.overdueCount > 0 ? 'danger' : 'neutral' },
    { key: 'flaggedCount', label: 'Flagged', value: summary.flaggedCount, tone: summary.flaggedCount > 0 ? 'warning' : 'neutral' },
    { key: 'staleCount', label: 'Stale 7d+', value: summary.staleCount, tone: summary.staleCount > 0 ? 'warning' : 'neutral' },
  ];
}

export function useBacklogHealthAdapter(projectKey: string | null) {
  const { data: issues = [], isLoading, error } = useQuery<RawIssue[]>({
    queryKey: ['backlog-health', projectKey],
    enabled: !!projectKey,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!projectKey) return [];
      const PAGE = 1000;
      const rows: RawIssue[] = [];
      for (let from = 0; from < 20000; from += PAGE) {
        const { data, error: qErr } = await supabase
          .from('ph_issues')
          .select(INSIGHTS_SELECT)
          .eq('project_key', projectKey)
          .in('issue_type', BACKLOG_ISSUE_TYPES)
          .is('jira_removed_at', null)
          .is('archived_at', null)
          .or(`source.eq.catalyst,jira_created_at.gte.${YEAR_2026_START},jira_updated_at.gte.${YEAR_2026_START}`)
          .range(from, from + PAGE - 1);
        if (qErr) throw qErr;
        const batch = (data ?? []) as RawIssue[];
        rows.push(...batch);
        if (batch.length < PAGE) break;
      }
      return rows;
    },
  });

  const result = computeInsights(issues);

  const health: HealthResult = {
    items: result.items.map(toHealthItem),
    summary: {
      totalAnalyzed: result.summary.totalAnalyzed,
      attentionCount: result.summary.attentionCount,
      criticalCount: result.summary.criticalCount,
      highCount: result.summary.highCount,
      mediumCount: result.summary.mediumCount,
      overdueCount: result.summary.overdueCount,
      flaggedCount: result.summary.flaggedCount,
      staleCount: result.summary.staleCount,
      unassignedHighPriorityCount: result.summary.unassignedHighPriorityCount,
      moduleLevelInsights: result.summary.boardLevelInsights,
      capabilityGaps: result.summary.capabilityGaps,
    },
    engineUsed: 'score',
  };

  return { health, kpis: toKPIs(result.summary), isLoading, error };
}
