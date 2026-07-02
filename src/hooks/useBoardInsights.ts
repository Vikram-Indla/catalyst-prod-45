/**
 * useBoardInsights — deterministic attention scoring for a single Catalyst board.
 *
 * Fetches ph_issues scoped to the board's project_key, computes an explainable
 * attention score per item, and returns ranked results + board-level summary.
 *
 * Capability gaps (no sprint end date, no status_changed_at):
 *   - Sprint risk: NOT AVAILABLE — sprint_name is text-only, no end date exists.
 *   - Time-in-status: uses jira_updated_at as fallback (labelled "last updated").
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BOARD_INSIGHTS_CONFIG,
  getRiskBand,
  type RiskBand,
} from '@/lib/boardInsightsConfig';
import type { Board } from '@/types/board';

// ── Raw issue shape from ph_issues ──────────────────────────────────────────

export interface RawIssue {
  id: string;
  issue_key: string | null;
  summary: string | null;
  status: string | null;
  status_category: string | null;
  issue_type: string | null;
  priority: string | null;
  assignee_display_name: string | null;
  assignee_account_id: string | null;
  sprint_name: string | null;
  is_flagged: boolean | null;
  jira_updated_at: string | null;
  jira_created_at: string | null;
  due_date: string | null;
  project_key: string | null;
  parent_key: string | null;
}

export const INSIGHTS_SELECT =
  'id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, assignee_account_id, sprint_name, is_flagged, jira_updated_at, jira_created_at, due_date, project_key, parent_key';

// ── Scored output types ──────────────────────────────────────────────────────

export interface AttentionSignal {
  label: string;
  weight: number;
}

export interface AttentionItem {
  id: string;
  itemKey: string | null;
  title: string | null;
  type: string | null;
  status: string | null;
  statusCategory: string | null;
  priority: string | null;
  assignee: string | null;
  assigneeId: string | null;
  sprintName: string | null;
  dueDate: string | null;
  lastUpdated: string | null;
  createdAt: string | null;
  parentKey: string | null;
  projectKey: string | null;
  attentionScore: number;
  riskBand: RiskBand;
  primaryReason: string;
  secondaryReasons: string[];
  recommendedAction: string;
  signals: AttentionSignal[];
  confidence: 'High' | 'Medium' | 'Low';
  daysOverdue: number | null;
  staleDays: number | null;
}

export interface BoardInsightsSummary {
  totalAnalyzed: number;
  attentionCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  overdueCount: number;
  flaggedCount: number;
  staleCount: number;
  unassignedHighPriorityCount: number;
  boardLevelInsights: string[];
  capabilityGaps: string[];
}

export interface BoardInsightsResult {
  items: AttentionItem[];
  summary: BoardInsightsSummary;
}

// ── Scoring engine ───────────────────────────────────────────────────────────

function daysDiff(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / 86_400_000);
}

function scoreIssue(
  issue: RawIssue,
  medianStaleDays: number,
): AttentionItem | null {
  const cfg = BOARD_INSIGHTS_CONFIG;
  const statusCat = (issue.status_category ?? '').toLowerCase();

  // Exclude done/closed
  if (statusCat === 'done') return null;

  const priority = (issue.priority ?? 'unknown').toLowerCase();
  const statusText = (issue.status ?? '').toLowerCase();

  const staleDays = daysDiff(issue.jira_updated_at);
  const ageDays = daysDiff(issue.jira_created_at);

  let daysOverdue: number | null = null;
  let daysToDue: number | null = null;
  if (issue.due_date) {
    const diff = daysDiff(issue.due_date);
    if (diff !== null) {
      if (diff > 0) daysOverdue = diff;
      else daysToDue = -diff;
    }
  }

  const isOverdue = daysOverdue !== null && daysOverdue > 0;
  const isFlagged = !!issue.is_flagged;
  const isStatusAtRisk = cfg.statusRiskKeywords.some(kw => statusText.includes(kw));
  const isUnassigned = !issue.assignee_account_id;
  const isHighOrCriticalPriority = priority === 'critical' || priority === 'high';
  const isStale7d = staleDays !== null && staleDays >= cfg.staleThresholds.high;
  const isStale3d = staleDays !== null && staleDays >= cfg.staleThresholds.medium;

  const signals: AttentionSignal[] = [];
  let baseScore = 0;

  if (isFlagged) {
    baseScore += cfg.weights.flagged;
    signals.push({ label: 'Flagged for attention', weight: cfg.weights.flagged });
  }
  if (isOverdue) {
    baseScore += cfg.weights.overdueTarget;
    signals.push({ label: `Overdue by ${daysOverdue}d (due date passed)`, weight: cfg.weights.overdueTarget });
  } else if (daysToDue !== null) {
    if (daysToDue <= 1) {
      baseScore += cfg.weights.dueWithin1d;
      signals.push({ label: 'Due within 1 day', weight: cfg.weights.dueWithin1d });
    } else if (daysToDue <= 3) {
      baseScore += cfg.weights.dueWithin3d;
      signals.push({ label: `Due in ${daysToDue}d`, weight: cfg.weights.dueWithin3d });
    } else if (daysToDue <= 7) {
      baseScore += cfg.weights.dueWithin7d;
      signals.push({ label: `Due in ${daysToDue}d`, weight: cfg.weights.dueWithin7d });
    }
  }
  if (isStatusAtRisk) {
    baseScore += cfg.weights.statusAtRisk;
    signals.push({ label: `Status "${issue.status}" indicates risk`, weight: cfg.weights.statusAtRisk });
  }
  if (isStale7d) {
    baseScore += cfg.weights.stale7d;
    signals.push({ label: `Not updated in ${staleDays}d (7d+ stale)`, weight: cfg.weights.stale7d });
  } else if (isStale3d) {
    baseScore += cfg.weights.stale3d;
    signals.push({ label: `Not updated in ${staleDays}d (3d+ stale)`, weight: cfg.weights.stale3d });
  }
  if (isUnassigned && isHighOrCriticalPriority) {
    baseScore += cfg.weights.unassignedHighPriority;
    signals.push({ label: `Unassigned ${priority} priority item`, weight: cfg.weights.unassignedHighPriority });
  }
  if (staleDays !== null && medianStaleDays > 0 && staleDays >= medianStaleDays * 2) {
    baseScore += cfg.weights.aboveBoardMedian2x;
    signals.push({ label: `Last updated is 2× board median stale (median ${medianStaleDays}d)`, weight: cfg.weights.aboveBoardMedian2x });
  }

  if (signals.length === 0) return null;

  const priorityMult = cfg.priorityMultiplier[priority] ?? cfg.priorityMultiplier.unknown;
  const statusMult = isStatusAtRisk ? cfg.statusCategoryMultiplier.in_progress * 1.30 : (cfg.statusCategoryMultiplier[statusCat] ?? 1.00);

  const rawScore = baseScore * priorityMult * statusMult;
  const attentionScore = Math.min(100, Math.round(rawScore));

  if (attentionScore < cfg.minScoreToShow) return null;

  const riskBand = getRiskBand(attentionScore);
  if (!riskBand) return null;

  // Primary reason = highest-weight signal
  const sortedSignals = [...signals].sort((a, b) => b.weight - a.weight);
  const primaryReason = sortedSignals[0].label;
  const secondaryReasons = sortedSignals.slice(1).map(s => s.label);

  // Recommended action
  let recommendedAction = 'Review this item with the assignee.';
  if (isFlagged || isStatusAtRisk) {
    recommendedAction = 'Resolve or escalate the blocker. Confirm whether the item can proceed.';
  } else if (isOverdue) {
    recommendedAction = 'Confirm whether the target date needs revision or escalate delivery risk.';
  } else if (isUnassigned && isHighOrCriticalPriority) {
    recommendedAction = 'Assign an owner immediately or move it out of committed scope.';
  } else if (isStale7d) {
    recommendedAction = 'Request a status update from the assignee or confirm whether the item is still active.';
  } else if (daysToDue !== null && daysToDue <= 3) {
    recommendedAction = 'Confirm the item is on track to complete before the due date.';
  }

  // Confidence
  const hasKeyFields = !!issue.due_date && !!issue.assignee_account_id && !!issue.jira_updated_at;
  const hasMinFields = !!issue.jira_updated_at || !!issue.due_date;
  const confidence: 'High' | 'Medium' | 'Low' = hasKeyFields ? 'High' : hasMinFields ? 'Medium' : 'Low';

  return {
    id: issue.id,
    itemKey: issue.issue_key,
    title: issue.summary,
    type: issue.issue_type,
    status: issue.status,
    statusCategory: issue.status_category,
    priority: issue.priority,
    assignee: issue.assignee_display_name,
    assigneeId: issue.assignee_account_id,
    sprintName: issue.sprint_name,
    dueDate: issue.due_date,
    lastUpdated: issue.jira_updated_at,
    createdAt: issue.jira_created_at,
    parentKey: issue.parent_key,
    projectKey: issue.project_key,
    attentionScore,
    riskBand,
    primaryReason,
    secondaryReasons,
    recommendedAction,
    signals,
    confidence,
    daysOverdue,
    staleDays,
  };
}

export function computeInsights(issues: RawIssue[]): BoardInsightsResult {
  const cfg = BOARD_INSIGHTS_CONFIG;

  // Compute board median stale days (exclude done items)
  const activeIssues = issues.filter(i => (i.status_category ?? '') !== 'done');
  const staleDaysList = activeIssues
    .map(i => daysDiff(i.jira_updated_at))
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);
  const medianStaleDays = staleDaysList.length > 0
    ? staleDaysList[Math.floor(staleDaysList.length / 2)]
    : 0;

  const scored = issues
    .map(i => scoreIssue(i, medianStaleDays))
    .filter((i): i is AttentionItem => i !== null)
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, cfg.maxItemsToShow);

  const criticalCount = scored.filter(i => i.riskBand === 'Critical').length;
  const highCount = scored.filter(i => i.riskBand === 'High').length;
  const mediumCount = scored.filter(i => i.riskBand === 'Medium').length;
  const overdueCount = scored.filter(i => i.daysOverdue !== null && i.daysOverdue > 0).length;
  const flaggedCount = scored.filter(i => i.signals.some(s => s.label.includes('Flagged'))).length;
  const staleCount = scored.filter(i => i.staleDays !== null && i.staleDays >= cfg.staleThresholds.high).length;
  const unassignedHighPriorityCount = scored.filter(i =>
    !i.assigneeId && (i.priority === 'critical' || i.priority === 'high')
  ).length;

  const boardLevelInsights: string[] = [];
  if (criticalCount > 0) boardLevelInsights.push(`${criticalCount} item${criticalCount > 1 ? 's' : ''} at critical risk.`);
  if (overdueCount > 0) boardLevelInsights.push(`${overdueCount} item${overdueCount > 1 ? 's' : ''} past their due date.`);
  if (flaggedCount > 0) boardLevelInsights.push(`${flaggedCount} flagged item${flaggedCount > 1 ? 's' : ''} need${flaggedCount === 1 ? 's' : ''} attention.`);
  if (staleCount > 0) boardLevelInsights.push(`${staleCount} item${staleCount > 1 ? 's' : ''} not updated in 7+ days.`);
  if (unassignedHighPriorityCount > 0) boardLevelInsights.push(`${unassignedHighPriorityCount} high/critical priority item${unassignedHighPriorityCount > 1 ? 's are' : ' is'} unassigned.`);
  if (medianStaleDays > 0) boardLevelInsights.push(`Board median last-updated: ${medianStaleDays} day${medianStaleDays !== 1 ? 's' : ''} ago.`);

  const capabilityGaps: string[] = [
    'Sprint risk not available — sprint end date is not stored in Catalyst (sprint_name is text-only).',
    'Time-in-status not available — status_changed_at field does not exist; last-updated date used as proxy.',
  ];

  return {
    items: scored,
    summary: {
      totalAnalyzed: issues.length,
      attentionCount: scored.length,
      criticalCount,
      highCount,
      mediumCount,
      overdueCount,
      flaggedCount,
      staleCount,
      unassignedHighPriorityCount,
      boardLevelInsights,
      capabilityGaps,
    },
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBoardInsights(board: Board | null) {
  const projectKey = board?.filterProjectIds?.length
    ? null  // multi-project board — query by filterProjectIds not supported yet
    : null;

  // Derive project_key from board context — boards are scoped to a project
  // We resolve it via the boardBasePath or by reading filterConfig
  // For now we use board.projectId to get the key via a sub-query
  const boardId = board?.id ?? null;

  const { data: issues = [], isLoading, error } = useQuery<RawIssue[]>({
    queryKey: ['board-insights', boardId],
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000, // 2 min cache
    queryFn: async () => {
      if (!boardId) return [];

      // Fetch board's project_key via board→ph_projects join
      // board.filterProjectIds contains project UUIDs
      // We resolve project_keys from those UUIDs
      const { data: boardData } = await supabase
        .from('boards')
        .select('filter_project_ids, project_id')
        .eq('id', boardId)
        .single();

      const projectIds: string[] = [];
      if (boardData?.filter_project_ids?.length) {
        projectIds.push(...boardData.filter_project_ids);
      } else if (boardData?.project_id) {
        projectIds.push(boardData.project_id);
      }

      if (projectIds.length === 0) return [];

      // Resolve project_keys from project UUIDs
      const { data: projects } = await supabase
        .from('ph_projects')
        .select('key')
        .in('id', projectIds);

      const keys = (projects ?? []).map((p: { key: string }) => p.key).filter(Boolean);
      if (keys.length === 0) return [];

      // Fetch issues for those project keys, exclude done/archived/deleted
      const { data: rows, error: qErr } = await supabase
        .from('ph_issues')
        .select(INSIGHTS_SELECT)
        .in('project_key', keys)
        .is('archived_at', null)
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false });

      if (qErr) throw qErr;
      return (rows ?? []) as RawIssue[];
    },
  });

  const result = useMemo<BoardInsightsResult>(() => {
    if (issues.length === 0) {
      return {
        items: [],
        summary: {
          totalAnalyzed: 0,
          attentionCount: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          overdueCount: 0,
          flaggedCount: 0,
          staleCount: 0,
          unassignedHighPriorityCount: 0,
          boardLevelInsights: [],
          capabilityGaps: [
            'Sprint risk not available — no sprint end date stored.',
            'Time-in-status not available — status_changed_at field does not exist.',
          ],
        },
      };
    }
    return computeInsights(issues);
  }, [issues]);

  return { result, isLoading, error };
}
