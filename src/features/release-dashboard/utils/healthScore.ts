/**
 * Health Score Calculation
 * Based on RELEASE-DASHBOARD-SPEC-V5 Section 4
 */

interface ReleaseMetricsForHealth {
  passedTests: number;
  executedTests: number;
  storiesWithTests: number;
  totalStories: number;
  blockerDefects: number;
  criticalDefects: number;
  majorDefects: number;
  passingGates: number;
  totalGates: number;
  scopeCreep: number;
}

interface ReleaseSchedule {
  status: 'on_track' | 'at_risk' | 'delayed';
}

const WEIGHTS = {
  passRate: 0.25,
  testCoverage: 0.15,
  defectScore: 0.20,
  gateCompliance: 0.20,
  scheduleScore: 0.10,
  scopeStability: 0.10,
};

export function calculateHealthScore(
  metrics: ReleaseMetricsForHealth,
  schedule: ReleaseSchedule
): number {
  // Pass rate calculation
  const passRate = metrics.executedTests > 0 
    ? (metrics.passedTests / metrics.executedTests) * 100 
    : 0;

  // Test coverage
  const testCoverage = metrics.totalStories > 0 
    ? (metrics.storiesWithTests / metrics.totalStories) * 100 
    : 0;

  // Defect penalty calculation
  const defectPenalty =
    (metrics.blockerDefects * 20) +
    (metrics.criticalDefects * 10) +
    (metrics.majorDefects * 5);
  const defectScore = Math.max(0, 100 - defectPenalty);

  // Gate compliance
  const gateCompliance = metrics.totalGates > 0 
    ? (metrics.passingGates / metrics.totalGates) * 100 
    : 100;

  // Schedule score
  const scheduleScore = schedule.status === 'on_track' ? 100 
    : schedule.status === 'at_risk' ? 50 : 0;

  // Scope stability
  const scopeStability = Math.max(0, 100 - (metrics.scopeCreep * 2));

  // Weighted calculation
  return Math.round(
    (passRate * WEIGHTS.passRate) +
    (testCoverage * WEIGHTS.testCoverage) +
    (defectScore * WEIGHTS.defectScore) +
    (gateCompliance * WEIGHTS.gateCompliance) +
    (scheduleScore * WEIGHTS.scheduleScore) +
    (scopeStability * WEIGHTS.scopeStability)
  );
}
