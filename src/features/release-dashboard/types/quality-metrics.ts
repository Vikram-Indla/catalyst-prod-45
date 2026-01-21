/**
 * Module 5B-1: Release Quality Metrics - Types
 */

export interface TestExecutionMetrics {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
  pass_rate: number;
  coverage_percent: number;
}

export interface DefectMetrics {
  open: number;
  closed: number;
  blocker: number;
  critical: number;
  total: number;
}

export interface AutomationMetrics {
  rate: number;
  automated_count: number;
  manual_count: number;
}

export interface ReleaseQualityMetrics {
  release_id: string;
  test_execution: TestExecutionMetrics;
  defects: DefectMetrics;
  automation: AutomationMetrics;
  calculated_at: string;
}

export interface HealthBreakdownItem {
  value: number;
  weight: number;
}

export interface ReleaseHealthData {
  release_id: string;
  score: number;
  level: 'healthy' | 'attention' | 'at_risk' | 'critical';
  breakdown: {
    pass_rate: HealthBreakdownItem;
    coverage: HealthBreakdownItem;
    defects: HealthBreakdownItem;
    automation: HealthBreakdownItem;
  };
  metrics: ReleaseQualityMetrics;
  calculated_at: string;
}

export interface ExecutionTrendPoint {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
}

export const HEALTH_LEVEL_CONFIG: Record<ReleaseHealthData['level'], {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  healthy: { 
    label: 'Healthy', 
    color: 'hsl(var(--teal))', 
    bgColor: 'hsl(var(--teal) / 0.1)',
    description: 'Release is on track with all quality gates passing' 
  },
  attention: { 
    label: 'Needs Attention', 
    color: 'hsl(var(--warning))', 
    bgColor: 'hsl(var(--warning) / 0.1)',
    description: 'Some quality metrics require attention' 
  },
  at_risk: { 
    label: 'At Risk', 
    color: 'hsl(var(--warning))', 
    bgColor: 'hsl(var(--warning) / 0.1)',
    description: 'Multiple quality issues need immediate attention' 
  },
  critical: { 
    label: 'Critical', 
    color: 'hsl(var(--destructive))', 
    bgColor: 'hsl(var(--destructive) / 0.1)',
    description: 'Release is at high risk and requires intervention' 
  }
};

export const METRIC_THRESHOLDS = {
  pass_rate: { good: 85, warning: 70, critical: 50 },
  coverage: { good: 80, warning: 60, critical: 40 },
  defects_open: { good: 0, warning: 3, critical: 5 },
  automation: { good: 70, warning: 50, critical: 30 }
} as const;