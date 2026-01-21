/**
 * Advanced Analytics Types
 * Module 5C: Release-Level Analytics, Cross-Release Comparison, Custom Dashboards
 */

// ─────────────────────────────────────────────────────────────────────────────
// 5C-1: Release Analytics Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export type TimeGranularity = 'day' | 'week' | 'month';
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'radar';
export type MetricCategory = 'execution' | 'quality' | 'defects' | 'coverage' | 'velocity';

export interface ReleaseAnalyticsSummary {
  releaseId: string;
  releaseName: string;
  period: {
    start: string;
    end: string;
  };
  keyMetrics: {
    totalTestCases: number;
    executedCount: number;
    passedCount: number;
    failedCount: number;
    blockedCount: number;
    skippedCount: number;
    executionRate: number;
    passRate: number;
    failRate: number;
    automationRate: number;
  };
  defectMetrics: {
    totalOpen: number;
    totalClosed: number;
    blockers: number;
    criticals: number;
    avgResolutionDays: number;
    defectDensity: number;
  };
  velocityMetrics: {
    avgDailyExecution: number;
    peakDailyExecution: number;
    estimatedCompletionDate: string | null;
    daysRemaining: number | null;
  };
  qualityGateMetrics: {
    totalGates: number;
    passedGates: number;
    failedGates: number;
    blockingPassed: number;
    blockingTotal: number;
  };
}

export interface AnalyticsTrendData {
  date: string;
  dateLabel: string;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  passRate: number;
  executionRate: number;
  cumulativeExecuted: number;
  cumulativePassed: number;
}

export interface DefectAgingData {
  ageGroup: string;
  ageMin: number;
  ageMax: number;
  blocker: number;
  critical: number;
  major: number;
  minor: number;
  total: number;
}

export interface CoverageBreakdown {
  category: string;
  categoryId: string;
  totalCases: number;
  executed: number;
  passed: number;
  failed: number;
  coveragePercent: number;
  passRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5C-2: Cross-Release Comparison Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReleaseComparisonItem {
  releaseId: string;
  releaseName: string;
  releaseVersion: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalCycles: number;
  totalTestCases: number;
  executionRate: number;
  passRate: number;
  failRate: number;
  totalDefects: number;
  openDefects: number;
  blockerDefects: number;
  healthScore: number;
  healthLevel: 'healthy' | 'attention' | 'at_risk' | 'critical';
}

export interface ComparisonMetric {
  key: string;
  label: string;
  unit: '%' | 'count' | 'days' | 'score';
  higherIsBetter: boolean;
}

export const COMPARISON_METRICS: ComparisonMetric[] = [
  { key: 'executionRate', label: 'Execution Rate', unit: '%', higherIsBetter: true },
  { key: 'passRate', label: 'Pass Rate', unit: '%', higherIsBetter: true },
  { key: 'failRate', label: 'Fail Rate', unit: '%', higherIsBetter: false },
  { key: 'totalDefects', label: 'Total Defects', unit: 'count', higherIsBetter: false },
  { key: 'openDefects', label: 'Open Defects', unit: 'count', higherIsBetter: false },
  { key: 'blockerDefects', label: 'Blocker Defects', unit: 'count', higherIsBetter: false },
  { key: 'healthScore', label: 'Health Score', unit: 'score', higherIsBetter: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5C-3: Custom Dashboard Builder Types
// ─────────────────────────────────────────────────────────────────────────────

export type WidgetType = 
  | 'metric_card'
  | 'trend_chart'
  | 'pie_chart'
  | 'bar_chart'
  | 'table'
  | 'heatmap'
  | 'gauge'
  | 'comparison';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  dataSource: {
    metric: string;
    filters?: Record<string, string>;
    groupBy?: string;
  };
  size: 'sm' | 'md' | 'lg' | 'xl';
  position: { row: number; col: number };
  config: Record<string, unknown>;
}

export interface CustomDashboard {
  id: string;
  name: string;
  description?: string;
  releaseId?: string;
  isGlobal: boolean;
  widgets: DashboardWidget[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  widgets: Omit<DashboardWidget, 'id'>[];
  category: 'release' | 'quality' | 'defects' | 'team';
}

export const WIDGET_SIZE_CONFIG: Record<DashboardWidget['size'], { cols: number; rows: number }> = {
  sm: { cols: 1, rows: 1 },
  md: { cols: 2, rows: 1 },
  lg: { cols: 2, rows: 2 },
  xl: { cols: 4, rows: 2 },
};

export const AVAILABLE_WIDGETS: Array<{
  type: WidgetType;
  label: string;
  description: string;
  icon: string;
  defaultSize: DashboardWidget['size'];
}> = [
  { type: 'metric_card', label: 'Metric Card', description: 'Single metric with trend', icon: 'Hash', defaultSize: 'sm' },
  { type: 'trend_chart', label: 'Trend Chart', description: 'Line/area chart over time', icon: 'TrendingUp', defaultSize: 'lg' },
  { type: 'pie_chart', label: 'Pie Chart', description: 'Distribution breakdown', icon: 'PieChart', defaultSize: 'md' },
  { type: 'bar_chart', label: 'Bar Chart', description: 'Comparison bars', icon: 'BarChart3', defaultSize: 'md' },
  { type: 'table', label: 'Data Table', description: 'Tabular data view', icon: 'Table', defaultSize: 'lg' },
  { type: 'heatmap', label: 'Heatmap', description: 'Activity/coverage heatmap', icon: 'Grid3x3', defaultSize: 'lg' },
  { type: 'gauge', label: 'Gauge', description: 'Progress/threshold gauge', icon: 'Gauge', defaultSize: 'sm' },
  { type: 'comparison', label: 'Comparison', description: 'Compare multiple values', icon: 'GitCompare', defaultSize: 'md' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5C-4: Export & Scheduled Reports Types
// ─────────────────────────────────────────────────────────────────────────────

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'on_release';

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  releaseId?: string;
  dashboardId?: string;
  reportType: 'readiness' | 'analytics' | 'comparison' | 'custom';
  format: 'pdf' | 'html' | 'csv' | 'json';
  schedule: {
    frequency: ScheduleFrequency;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm
    timezone: string;
  };
  recipients: string[];
  isActive: boolean;
  lastSentAt?: string;
  nextScheduledAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface ExportJob {
  id: string;
  type: 'immediate' | 'scheduled';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'pdf' | 'html' | 'csv' | 'json' | 'xlsx';
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

export const SCHEDULE_FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  on_release: 'On Release Status Change',
};

export const EXPORT_FORMAT_CONFIG: Record<ExportJob['format'], {
  label: string;
  icon: string;
  mimeType: string;
}> = {
  pdf: { label: 'PDF Document', icon: 'FileText', mimeType: 'application/pdf' },
  html: { label: 'HTML Report', icon: 'Code', mimeType: 'text/html' },
  csv: { label: 'CSV Spreadsheet', icon: 'Table', mimeType: 'text/csv' },
  json: { label: 'JSON Data', icon: 'Braces', mimeType: 'application/json' },
  xlsx: { label: 'Excel Workbook', icon: 'Sheet', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};
