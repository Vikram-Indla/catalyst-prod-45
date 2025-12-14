// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Domain Types
// Enterprise Portfolio Management Platform
// ═══════════════════════════════════════════════════════════════════════════════

export type RiskLevel = 'low' | 'medium' | 'high';

export type StatusCode =
  | 'on-track'
  | 'completed'
  | 'in-progress'
  | 'pending'
  | 'at-risk'
  | 'off-track'
  | 'blocked';

export interface OkrRisk {
  id: string;
  level: RiskLevel;
  probability?: number; // 0–1 (optional, for future)
  impactValue?: number; // SAR value of impact (optional, for future)
  status: 'open' | 'closed';
  dueDate?: string;
}

export interface OkrRiskSummary {
  high: number;
  medium: number;
  low: number;
}

export interface OkrValue {
  estimated: number; // total expected value (SAR)
  realized: number; // value realized so far (SAR)
  valueAtRisk?: number; // Backend-provided VaR (optional)
}

export interface WorkItem {
  id: string;
  type: 'workItem';
  name: string;
  krId: string;
  objectiveId: string;
  themeId: string;
  status: StatusCode;
  progress: number; // 0–100
  releaseDate?: string;
  daysVariance?: number; // +ve late, -ve early, 0 on-time
  risks: OkrRiskSummary;
  value: OkrValue;
  dependencies: string[]; // ids of other WorkItems
}

export interface KeyResult {
  id: string;
  type: 'keyResult';
  name: string;
  objectiveId: string;
  themeId: string;
  status: StatusCode;
  progress: number; // 0–100 (derived from actual/target when numeric)
  actual?: number;
  target?: number;
  baseline?: number;
  unit?: string;
  weight: number; // 0–1; we will normalise per objective
  dueDate?: string;
  risks: OkrRiskSummary;
  value: OkrValue;
  workItems: WorkItem[];
  direction?: 'increase' | 'decrease' | 'maintain';
  ownerId?: string;
  ownerName?: string;
}

export interface Objective {
  id: string;
  type: 'objective';
  name: string;
  description?: string;
  themeId: string;
  status: StatusCode;
  progress: number; // derived from KR roll-up
  risks: OkrRiskSummary;
  value: OkrValue;
  keyResults: KeyResult[];
  ownerId?: string;
  ownerName?: string;
  startDate?: string;
  dueDate?: string;
}

export interface Theme {
  id: string;
  type: 'theme';
  name: string;
  color: string;
  status: StatusCode;
  progress: number; // derived from Objectives
  risks: OkrRiskSummary;
  value: OkrValue;
  sectors: string[];
  strategicPillar?: string;
  objectives: Objective[];
  ownerId?: string;
  ownerName?: string;
}

export interface StrategicData {
  themes: Theme[];
  lastUpdated: string;
}

// Filter types for smart filtering
export interface OKRSmartFiltersV2 {
  // Theme filter
  selectedThemeIds?: string[];
  // Status filter
  statuses?: StatusCode[];
  // Risk filter
  minRiskLevel?: RiskLevel;
  hasHighRisk?: boolean;
  noRisks?: boolean;
  // Coverage gaps
  objectivesWithUnimplementedKRs?: boolean;
  krsWithNoWork?: boolean;
  // Due horizon
  dueDays?: 30 | 60 | 90 | null;
  overdue?: boolean;
  // Value
  lowValueRealization?: boolean; // < 50%
  hasValueAtRisk?: boolean;
  // Progress
  progressMin?: number;
  progressMax?: number;
}

// Rollup metrics for analytics
export interface RollupMetrics {
  objectiveCount: number;
  krCount: number;
  workItemCount: number;
  objectivesByStatus: Record<StatusCode, number>;
  krsByStatus: Record<StatusCode, number>;
  krsWithoutWork: number;
  totalRiskScore: number;
  valueRealizationPct: number;
  totalEstimatedValue: number;
  totalRealizedValue: number;
}

// Tree item for unified tree rendering (no theme level in tree)
export type TreeItem = Objective | KeyResult | WorkItem;
export type TreeItemLevel = 'objective' | 'keyResult' | 'workItem';

export interface TreeNodeData {
  item: TreeItem;
  level: number;
  themeColor: string;
  themeName: string;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
}

// Progress baseline for trend analysis
export type TrendCode = 'ahead' | 'on-plan' | 'behind' | 'none';

export interface ProgressBaseline {
  actual: number;           // 0–100
  expected: number | null;  // 0–100, null if dates missing
  variance: number | null;  // actual - expected
  trend: TrendCode;
}
