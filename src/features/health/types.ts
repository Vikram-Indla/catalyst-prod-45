/**
 * Health Engine — shared types for the generalized <HealthPanel>.
 *
 * Phase 0 (CAT-HEALTH-ENGINE-20260702-001) wires only `moduleKey: 'board'`.
 * Later phases (backlog/filters/sprint/timeline/dependencies) add their own
 * HealthScope variant + adapter without changing this facade's shape.
 */

export type HealthModuleKey = 'board' | 'backlog' | 'filters' | 'sprint' | 'timeline' | 'dependencies';

export type HealthScope =
  | { moduleKey: 'board'; boardId: string; projectKey?: string }
  | { moduleKey: 'backlog'; projectKey: string }
  | { moduleKey: 'filters'; filterId: string }
  | { moduleKey: 'sprint'; sprintId: string }
  | { moduleKey: 'timeline'; releaseId: string }
  | { moduleKey: 'dependencies'; projectKey: string };

export interface HealthKPI {
  key: string;
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'information';
}

export interface HealthSignal {
  label: string;
  weight: number;
}

/**
 * Normalized attention-list row. `kind: 'issue'` covers Phase 0 (board); later
 * phases (sprint days, release states) use `kind: 'day' | 'state' | 'generic'`
 * with data in `meta` rather than the issue-shaped fields below.
 */
export interface HealthAttentionItem {
  id: string;
  kind: 'issue' | 'day' | 'state' | 'generic';
  title: string | null;
  itemKey?: string | null;
  type?: string | null;
  status?: string | null;
  priority?: string | null;
  assignee?: { id: string | null; name: string | null } | null;
  projectKey?: string | null;
  dueDate?: string | null;
  lastUpdated?: string | null;
  sprintName?: string | null;
  riskBand: 'Critical' | 'High' | 'Medium' | null;
  attentionScore: number;
  primaryReason: string;
  secondaryReasons: string[];
  recommendation: string;
  signals: HealthSignal[];
  daysOverdue: number | null;
  staleDays: number | null;
  meta?: Record<string, unknown>;
}

export interface HealthSummary {
  totalAnalyzed: number;
  attentionCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  overdueCount: number;
  flaggedCount: number;
  staleCount: number;
  unassignedHighPriorityCount: number;
  moduleLevelInsights: string[];
  capabilityGaps: string[];
}

export interface HealthResult {
  items: HealthAttentionItem[];
  summary: HealthSummary;
  engineUsed: 'score' | 'state-machine';
}
