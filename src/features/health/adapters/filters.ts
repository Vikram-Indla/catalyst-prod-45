/**
 * Filters Health adapter — scores whatever result set the active JQL/saved
 * filter already fetched (via useJqlResults et al). Does NOT re-query —
 * FilterPreviewPage passes its already-fetched rows in, avoiding a duplicate
 * network round-trip. Reuses computeInsights (useBoardInsights.ts) unchanged.
 *
 * Caveat surfaced as a capability gap: JqlResultRow has no assignee_account_id
 * (only assigneeName), so "unassigned" here is proxied by an empty display
 * name rather than a true account id. Also: results are capped at whatever
 * limit the page's query used (100 for project JQL, 500 for product/tasks —
 * see useJqlResults.ts / FilterPreviewPage.tsx) — flagged, not silently hidden.
 */
import { useMemo } from 'react';
import { computeInsights, type RawIssue } from '@/hooks/useBoardInsights';
import type { HealthAttentionItem, HealthKPI, HealthResult, HealthSummary } from '../types';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';

function toRawIssue(r: JqlResultRow): RawIssue {
  return {
    id: r.id,
    issue_key: r.key,
    summary: r.summary,
    status: r.status,
    status_category: r.statusCategory,
    issue_type: r.issueType,
    priority: r.priority,
    assignee_display_name: r.assigneeName,
    assignee_account_id: r.assigneeName ? r.assigneeName : null,
    sprint_name: r.sprintName,
    is_flagged: r.isFlagged,
    jira_updated_at: r.updated,
    jira_created_at: r.created,
    due_date: r.dueDate,
    project_key: r.projectKey,
    parent_key: r.parentKey,
  };
}

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

function toKPIs(summary: HealthSummary): HealthKPI[] {
  return [
    { key: 'totalAnalyzed', label: 'Analysed', value: summary.totalAnalyzed, tone: 'neutral' },
    { key: 'attentionCount', label: 'Attention', value: summary.attentionCount, tone: summary.attentionCount > 0 ? 'warning' : 'neutral' },
    { key: 'criticalCount', label: 'Critical', value: summary.criticalCount, tone: summary.criticalCount > 0 ? 'danger' : 'neutral' },
    { key: 'overdueCount', label: 'Overdue', value: summary.overdueCount, tone: summary.overdueCount > 0 ? 'danger' : 'neutral' },
    { key: 'flaggedCount', label: 'Flagged', value: summary.flaggedCount, tone: summary.flaggedCount > 0 ? 'warning' : 'neutral' },
    { key: 'staleCount', label: 'Stale 7d+', value: summary.staleCount, tone: summary.staleCount > 0 ? 'warning' : 'neutral' },
  ];
}

export function useFiltersHealthAdapter(rows: JqlResultRow[] | undefined, resultCap: number) {
  const health: HealthResult = useMemo(() => {
    const issues = (rows ?? []).map(toRawIssue);
    const result = computeInsights(issues);
    const capabilityGaps = [...result.summary.capabilityGaps];
    if ((rows?.length ?? 0) >= resultCap) {
      capabilityGaps.unshift(`Results capped at ${resultCap} rows by the filter query — this scope may contain more matching items than analysed here.`);
    }
    return {
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
        capabilityGaps,
      },
      engineUsed: 'score',
    };
  }, [rows, resultCap]);

  return { health, kpis: toKPIs(health.summary) };
}
