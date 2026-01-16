/**
 * Release Health Score Algorithm
 * 
 * Health Score (0-100) = 
 *   (Pass Rate × 0.25) +
 *   (Test Coverage × 0.15) +
 *   (Defect Score × 0.20) +
 *   (Gate Compliance × 0.20) +
 *   (Schedule Score × 0.10) +
 *   (Scope Stability × 0.10)
 */

export interface HealthScoreInputs {
  passedTests: number;
  executedTests: number;
  storiesWithTests: number;
  totalStories: number;
  blockerDefects: number;
  criticalDefects: number;
  majorDefects: number;
  passingGates: number;
  totalGates: number;
  scheduleStatus: 'on_track' | 'at_risk' | 'delayed';
  scopeCreepPercent: number;
}

const WEIGHTS = {
  passRate: 0.25,
  testCoverage: 0.15,
  defectScore: 0.20,
  gateCompliance: 0.20,
  scheduleScore: 0.10,
  scopeStability: 0.10,
};

const SCHEDULE_SCORES = {
  on_track: 100,
  at_risk: 50,
  delayed: 0,
};

export type HealthLevel = 'healthy' | 'attention' | 'at_risk' | 'critical';

export interface HealthResult {
  score: number;
  level: HealthLevel;
  color: string;
  borderColor: string;
  bgColor: string;
}

export const HEALTH_THRESHOLDS: Record<HealthLevel, { min: number; color: string; borderColor: string; bgColor: string }> = {
  healthy: { min: 85, color: '#22c55e', borderColor: 'border-l-green-500', bgColor: 'bg-white' },
  attention: { min: 70, color: '#eab308', borderColor: 'border-l-yellow-500', bgColor: 'bg-white' },
  at_risk: { min: 50, color: '#f97316', borderColor: 'border-l-orange-500', bgColor: 'bg-orange-50' },
  critical: { min: 0, color: '#ef4444', borderColor: 'border-l-red-500', bgColor: 'bg-red-50' },
};

function calculatePassRate(passed: number, executed: number): number {
  if (executed === 0) return 100;
  return (passed / executed) * 100;
}

function calculateTestCoverage(storiesWithTests: number, totalStories: number): number {
  if (totalStories === 0) return 100;
  return (storiesWithTests / totalStories) * 100;
}

function calculateDefectScore(blockers: number, criticals: number, majors: number): number {
  const penalty = (blockers * 20) + (criticals * 10) + (majors * 5);
  return Math.max(0, 100 - penalty);
}

function calculateGateCompliance(passing: number, total: number): number {
  if (total === 0) return 100;
  return (passing / total) * 100;
}

function calculateScheduleScore(status: 'on_track' | 'at_risk' | 'delayed'): number {
  return SCHEDULE_SCORES[status];
}

function calculateScopeStability(scopeCreepPercent: number): number {
  return Math.max(0, 100 - (scopeCreepPercent * 2));
}

export function calculateHealthScore(inputs: HealthScoreInputs): number {
  const passRateScore = calculatePassRate(inputs.passedTests, inputs.executedTests);
  const coverageScore = calculateTestCoverage(inputs.storiesWithTests, inputs.totalStories);
  const defectScore = calculateDefectScore(inputs.blockerDefects, inputs.criticalDefects, inputs.majorDefects);
  const gateScore = calculateGateCompliance(inputs.passingGates, inputs.totalGates);
  const scheduleScore = calculateScheduleScore(inputs.scheduleStatus);
  const scopeScore = calculateScopeStability(inputs.scopeCreepPercent);

  const totalScore = 
    (passRateScore * WEIGHTS.passRate) +
    (coverageScore * WEIGHTS.testCoverage) +
    (defectScore * WEIGHTS.defectScore) +
    (gateScore * WEIGHTS.gateCompliance) +
    (scheduleScore * WEIGHTS.scheduleScore) +
    (scopeScore * WEIGHTS.scopeStability);

  return Math.round(totalScore);
}

export function getHealthLevel(score: number): HealthLevel {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'attention';
  if (score >= 50) return 'at_risk';
  return 'critical';
}

export function getHealthResult(score: number): HealthResult {
  const level = getHealthLevel(score);
  const config = HEALTH_THRESHOLDS[level];
  return {
    score,
    level,
    color: config.color,
    borderColor: config.borderColor,
    bgColor: config.bgColor,
  };
}

export function getHealthLevelLabel(level: HealthLevel): string {
  const labels: Record<HealthLevel, string> = {
    healthy: 'Healthy',
    attention: 'Attention',
    at_risk: 'At Risk',
    critical: 'Critical',
  };
  return labels[level];
}
