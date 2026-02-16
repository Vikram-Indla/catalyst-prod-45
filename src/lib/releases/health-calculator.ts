/**
 * ReleaseHub V2 — Health Score Engine
 * Weighted formula: PassRate(0.25) + Coverage(0.15) + DefectScore(0.20)
 *   + GateCompliance(0.20) + ScheduleScore(0.10) + ScopeStability(0.10)
 */

export interface ReleaseHealthInput {
  passed_tests: number;
  failed_tests: number;
  total_tests: number;
  stories_with_tests: number;
  total_stories: number;
  blocker_defects: number;
  critical_defects: number;
  major_defects: number;
  total_gates: number;
  passing_gates: number;
  days_until_target: number;
  scope_creep_percent: number;
  status: string;
}

export interface HealthBreakdown {
  pass_rate: number;
  test_coverage: number;
  defect_score: number;
  gate_compliance: number;
  schedule_score: number;
  scope_stability: number;
  total: number;
}

const WEIGHTS = {
  PASS_RATE: 0.25,
  TEST_COVERAGE: 0.15,
  DEFECT_SCORE: 0.20,
  GATE_COMPLIANCE: 0.20,
  SCHEDULE_SCORE: 0.10,
  SCOPE_STABILITY: 0.10,
} as const;

export function calculateHealthScore(r: ReleaseHealthInput): HealthBreakdown {
  const executed = r.passed_tests + r.failed_tests;
  const passRate = executed > 0 ? (r.passed_tests / executed) * 100 : 0;

  const testCoverage = r.total_stories > 0
    ? (r.stories_with_tests / r.total_stories) * 100
    : 0;

  const defectPenalty = (r.blocker_defects * 20) + (r.critical_defects * 10) + (r.major_defects * 5);
  const defectScore = Math.max(0, 100 - defectPenalty);

  const gateCompliance = r.total_gates > 0
    ? (r.passing_gates / r.total_gates) * 100
    : 100;

  let scheduleScore: number;
  if (r.status === 'released') {
    scheduleScore = 100;
  } else if (r.days_until_target < 0) {
    scheduleScore = 0;
  } else if (r.days_until_target < 7) {
    scheduleScore = 50;
  } else {
    scheduleScore = 100;
  }

  const scopeStability = Math.max(0, 100 - (r.scope_creep_percent * 2));

  const total = Math.round(
    (passRate * WEIGHTS.PASS_RATE) +
    (testCoverage * WEIGHTS.TEST_COVERAGE) +
    (defectScore * WEIGHTS.DEFECT_SCORE) +
    (gateCompliance * WEIGHTS.GATE_COMPLIANCE) +
    (scheduleScore * WEIGHTS.SCHEDULE_SCORE) +
    (scopeStability * WEIGHTS.SCOPE_STABILITY)
  );

  return {
    pass_rate: Math.round(passRate),
    test_coverage: Math.round(testCoverage),
    defect_score: Math.round(defectScore),
    gate_compliance: Math.round(gateCompliance),
    schedule_score: scheduleScore,
    scope_stability: Math.round(scopeStability),
    total: Math.min(100, Math.max(0, total)),
  };
}

export function getHealthLevel(score: number): 'critical' | 'at_risk' | 'healthy' {
  if (score >= 85) return 'healthy';
  if (score >= 50) return 'at_risk';
  return 'critical';
}
