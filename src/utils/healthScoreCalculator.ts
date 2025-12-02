import { HealthScoreBreakdown } from '@/types/reports.types';

export interface HealthScoreInputs {
  totalCases: number;
  executedCases: number;
  automatedCases: number;
  passedExecutions: number;
  totalExecutions: number;
  resolvedDefects: number;
  totalDefects: number;
  recentActivityCount: number;
  expectedActivityCount: number;
}

export function calculateHealthScore(inputs: HealthScoreInputs): HealthScoreBreakdown {
  // Coverage score (25% weight) - % of cases executed at least once
  const coverageScore = inputs.totalCases > 0 
    ? Math.round((inputs.executedCases / inputs.totalCases) * 100)
    : 0;

  // Automation score (20% weight) - % of automated tests
  const automationScore = inputs.totalCases > 0
    ? Math.round((inputs.automatedCases / inputs.totalCases) * 100)
    : 0;

  // Pass rate score (30% weight) - % of passed executions
  const passRateScore = inputs.totalExecutions > 0
    ? Math.round((inputs.passedExecutions / inputs.totalExecutions) * 100)
    : 0;

  // Defect resolution score (15% weight) - % of resolved defects
  const defectResolutionScore = inputs.totalDefects > 0
    ? Math.round((inputs.resolvedDefects / inputs.totalDefects) * 100)
    : 100; // If no defects, full score

  // Activity score (10% weight) - recent activity level
  const activityScore = inputs.expectedActivityCount > 0
    ? Math.min(100, Math.round((inputs.recentActivityCount / inputs.expectedActivityCount) * 100))
    : 0;

  // Calculate weighted overall score
  const overall = Math.round(
    (coverageScore * 0.25) +
    (automationScore * 0.20) +
    (passRateScore * 0.30) +
    (defectResolutionScore * 0.15) +
    (activityScore * 0.10)
  );

  return {
    coverage: { score: coverageScore, weight: 25 },
    automation: { score: automationScore, weight: 20 },
    passRate: { score: passRateScore, weight: 30 },
    defectResolution: { score: defectResolutionScore, weight: 15 },
    activity: { score: activityScore, weight: 10 },
    overall,
  };
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return '#10b981'; // Green
  if (score >= 60) return '#eab308'; // Yellow
  return '#ef4444'; // Red
}

export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'At Risk';
  return 'Critical';
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function formatStorageSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function calculateContributionScore(
  casesCreated: number,
  casesExecuted: number,
  defectsFound: number
): number {
  return (casesCreated * 2) + (casesExecuted * 3) + (defectsFound * 1);
}

export function calculateUsageScore(
  timesUsed: number,
  uniqueCycles: number,
  defectsFound: number
): number {
  return (timesUsed * 2) + (uniqueCycles * 3) + (defectsFound * 5);
}

export function getDaysAgo(date: Date | string): number {
  const now = new Date();
  const then = new Date(date);
  const diffTime = Math.abs(now.getTime() - then.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getRetirementRecommendation(daysInactive: number): string {
  if (daysInactive > 180) return 'Consider archiving';
  if (daysInactive > 90) return 'Review for relevance';
  return 'Monitor usage';
}
