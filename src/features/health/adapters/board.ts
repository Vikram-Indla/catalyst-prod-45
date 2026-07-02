/**
 * Board Health adapter — wraps useBoardInsights unchanged and reshapes its
 * output into the generic HealthResult shape. Scoring logic (useBoardInsights,
 * boardInsightsConfig) is untouched; this file is a pure passthrough/reshape.
 */
import { useBoardInsights, type AttentionItem, type BoardInsightsResult } from '@/hooks/useBoardInsights';
import type { Board } from '@/types/board';
import type { HealthAttentionItem, HealthKPI, HealthResult } from '../types';

function toHealthItem(item: AttentionItem): HealthAttentionItem {
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

function toKPIs(summary: BoardInsightsResult['summary']): HealthKPI[] {
  return [
    { key: 'totalAnalyzed', label: 'Analysed', value: summary.totalAnalyzed, tone: 'neutral' },
    { key: 'attentionCount', label: 'Attention', value: summary.attentionCount, tone: summary.attentionCount > 0 ? 'warning' : 'neutral' },
    { key: 'criticalCount', label: 'Critical', value: summary.criticalCount, tone: summary.criticalCount > 0 ? 'danger' : 'neutral' },
    { key: 'overdueCount', label: 'Overdue', value: summary.overdueCount, tone: summary.overdueCount > 0 ? 'danger' : 'neutral' },
    { key: 'flaggedCount', label: 'Flagged', value: summary.flaggedCount, tone: summary.flaggedCount > 0 ? 'warning' : 'neutral' },
    { key: 'staleCount', label: 'Stale 7d+', value: summary.staleCount, tone: summary.staleCount > 0 ? 'warning' : 'neutral' },
  ];
}

export function useBoardHealthAdapter(board: Board | null) {
  const { result, isLoading, error } = useBoardInsights(board);

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
