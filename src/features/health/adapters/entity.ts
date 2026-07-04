/**
 * Entity Health adapter — covers BOTH Sprint and Timeline/Release Health,
 * since Catalyst already mounts ONE detail page (ReleaseDetailPage.tsx) for
 * both entity kinds via EntityConfig (src/lib/entity-hub/config.ts). Same
 * unification applies here: one adapter, config-driven.
 *
 * Issue association mirrors WorkItemsSection.tsx's proven approach:
 * - config.matchIssueByFk set (sprint): match ph_issues.<fk column> = entityId
 *   (S0.2b/D-002 — the sprint_release JSONB name-match is dead for sprints).
 * - otherwise (release): match ph_issues.sprint_release JSONB contains
 *   {name: entityName}, NOT the sprint_name text column (documented there as
 *   unreliable — jira-sync overwrites it).
 * Reuses computeInsights (useBoardInsights.ts) unchanged.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeInsights, INSIGHTS_SELECT, type RawIssue } from '@/hooks/useBoardInsights';
import type { EntityConfig } from '@/lib/entity-hub/config';
import type { HealthAttentionItem, HealthKPI, HealthResult } from '../types';

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

export function useEntityHealthAdapter(config: EntityConfig, entityId: string | null, entityName: string | null) {
  const { data: issues = [], isLoading, error } = useQuery<RawIssue[]>({
    queryKey: ['entity-health', config.kind, entityId],
    enabled: !!entityId && !!entityName,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const select = `${INSIGHTS_SELECT}, sprint_release`;

      if (config.matchIssueByFk) {
        const { data, error: fkErr } = await supabase
          .from('ph_issues')
          .select(select)
          .eq(config.matchIssueByFk, entityId as string)
          .limit(2000);
        if (fkErr) throw new Error(fkErr.message);
        return (data ?? []) as unknown as RawIssue[];
      }

      const target = (entityName ?? '').trim();
      if (!target) return [];

      const containsResult = await supabase
        .from('ph_issues')
        .select(select)
        .contains('sprint_release', JSON.stringify([{ name: target }]) as any)
        .limit(2000);
      if ((containsResult.data?.length ?? 0) > 0) {
        return containsResult.data as unknown as RawIssue[];
      }
      // Fallback: scan + filter client-side (handles JSON shape variants) —
      // same fallback WorkItemsSection.tsx uses for this exact match.
      const fb = await supabase
        .from('ph_issues')
        .select(select)
        .not('sprint_release', 'is', null)
        .limit(5000);
      if (!fb.data) return [];
      return (fb.data as any[]).filter((row) => {
        const arr = row.sprint_release;
        return Array.isArray(arr) && arr.some((el: any) => el && el.name === target);
      }) as unknown as RawIssue[];
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
