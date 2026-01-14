/**
 * Smart Assignment Algorithm
 * Distributes test cases to team members based on multiple factors
 */

import type {
  AssignmentWeights,
  Assignment,
  AssignmentFactors,
  SmartAssignmentTeamMember,
  TestCaseForAssignment,
  CycleContext,
} from '@/types/smart-assignment.types';

// Default weights that sum to 1.0
export const DEFAULT_WEIGHTS: AssignmentWeights = {
  workload: 0.30,
  skill: 0.35,
  performance: 0.20,
  availability: 0.15,
};

// Weight presets
export const WEIGHT_PRESETS = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Equal consideration of all factors',
    weights: DEFAULT_WEIGHTS,
  },
  {
    id: 'skill-focused',
    name: 'Skill-Focused',
    description: 'Prioritize expertise in module',
    weights: { workload: 0.20, skill: 0.50, performance: 0.20, availability: 0.10 },
  },
  {
    id: 'speed-focused',
    name: 'Speed-Focused',
    description: 'Prioritize fast execution',
    weights: { workload: 0.25, skill: 0.25, performance: 0.40, availability: 0.10 },
  },
  {
    id: 'availability-first',
    name: 'Availability-First',
    description: 'Prioritize team availability',
    weights: { workload: 0.25, skill: 0.20, performance: 0.15, availability: 0.40 },
  },
];

// Priority order for sorting (lower = higher priority)
const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Ensure weights sum to 1.0
 */
export function normalizeWeights(weights: AssignmentWeights): AssignmentWeights {
  const sum = weights.workload + weights.skill + weights.performance + weights.availability;
  if (sum === 0) return DEFAULT_WEIGHTS;
  
  return {
    workload: weights.workload / sum,
    skill: weights.skill / sum,
    performance: weights.performance / sum,
    availability: weights.availability / sum,
  };
}

/**
 * Calculate assignment score for a team member and test case
 */
export function calculateAssignmentScore(
  member: SmartAssignmentTeamMember,
  testCase: TestCaseForAssignment,
  context: CycleContext,
  weights: AssignmentWeights,
  currentLoad: number
): { score: number; factors: AssignmentFactors } {
  const normalizedWeights = normalizeWeights(weights);
  
  // 1. WORKLOAD SCORE (0-100)
  // Lower current workload = higher score
  const maxCapacity = member.dailyCapacity * context.remainingDays;
  const workloadRatio = maxCapacity > 0 ? currentLoad / maxCapacity : 1;
  const workloadScore = Math.max(0, 100 - (workloadRatio * 100));
  const workloadReason = `${currentLoad}/${maxCapacity} capacity used`;

  // 2. SKILL SCORE (0-100)
  // Higher skill level in test's module = higher score
  const skillData = member.skills[testCase.module];
  const skillLevel = skillData?.level || 1;
  const skillScore = (skillLevel / 5) * 100;
  const skillReason = `Level ${skillLevel}/5 in ${testCase.module}`;

  // 3. PERFORMANCE SCORE (0-100)
  // Combination of pass rate and execution speed
  const passRate = skillData?.passRate || 0.7;
  const avgTime = skillData?.avgExecutionTimeMinutes || testCase.estimatedDuration;
  const timeEfficiency = avgTime > 0 ? Math.min(1, testCase.estimatedDuration / avgTime) : 0.5;
  const performanceScore = (passRate * 60) + (timeEfficiency * 40);
  const performanceReason = `${Math.round(passRate * 100)}% pass rate`;

  // 4. AVAILABILITY SCORE (0-100)
  // Check calendar for remaining cycle days
  const availableDays = member.availability.filter(d => d.isAvailable).length;
  const totalDays = Math.max(context.remainingDays, 1);
  const availabilityScore = (availableDays / totalDays) * 100;
  const availabilityReason = `${availableDays}/${totalDays} days available`;

  // WEIGHTED TOTAL
  const totalScore = 
    (workloadScore * normalizedWeights.workload) +
    (skillScore * normalizedWeights.skill) +
    (performanceScore * normalizedWeights.performance) +
    (availabilityScore * normalizedWeights.availability);

  return {
    score: Math.round(totalScore * 100) / 100,
    factors: {
      workload: { score: Math.round(workloadScore), reason: workloadReason },
      skill: { score: Math.round(skillScore), reason: skillReason },
      performance: { score: Math.round(performanceScore), reason: performanceReason },
      availability: { score: Math.round(availabilityScore), reason: availabilityReason },
    },
  };
}

/**
 * Distribute tests across team members
 */
export function distributeTests(
  tests: TestCaseForAssignment[],
  team: SmartAssignmentTeamMember[],
  weights: AssignmentWeights,
  context: CycleContext
): Assignment[] {
  if (tests.length === 0 || team.length === 0) {
    return [];
  }

  const assignments: Assignment[] = [];
  const memberLoads = new Map<string, number>();

  // Initialize loads with current assignments
  team.forEach(m => memberLoads.set(m.id, m.currentAssignments));

  // Sort tests by priority (critical first)
  const sortedTests = [...tests].sort((a, b) => 
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  for (const test of sortedTests) {
    // Calculate scores for each team member
    const scores = team.map(member => {
      const currentLoad = memberLoads.get(member.id) || 0;
      const result = calculateAssignmentScore(member, test, context, weights, currentLoad);
      return {
        memberId: member.id,
        ...result,
      };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Assign to highest scorer
    const bestMatch = scores[0];
    assignments.push({
      testCaseId: test.id,
      assigneeId: bestMatch.memberId,
      score: bestMatch.score,
      factors: bestMatch.factors,
    });

    // Update member load for next iteration
    memberLoads.set(
      bestMatch.memberId,
      (memberLoads.get(bestMatch.memberId) || 0) + 1
    );
  }

  return assignments;
}

/**
 * Calculate distribution balance score (0-100)
 * Higher = more evenly distributed
 */
export function calculateDistributionScore(
  assignments: Assignment[],
  team: SmartAssignmentTeamMember[]
): number {
  if (assignments.length === 0 || team.length === 0) return 100;

  // Count assignments per member
  const counts = new Map<string, number>();
  team.forEach(m => counts.set(m.id, 0));
  assignments.forEach(a => {
    counts.set(a.assigneeId, (counts.get(a.assigneeId) || 0) + 1);
  });

  const values = Array.from(counts.values());
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  
  if (avg === 0) return 100;
  
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Coefficient of variation (relative to mean)
  const cv = stdDev / avg;
  
  // Convert to 0-100 score (lower CV = higher score)
  return Math.max(0, Math.round(100 - (cv * 50)));
}

/**
 * Get distribution health label
 */
export function getDistributionHealth(score: number): {
  label: string;
  color: 'teal' | 'primary' | 'warning' | 'danger';
} {
  if (score >= 90) return { label: 'Excellent', color: 'teal' };
  if (score >= 70) return { label: 'Good', color: 'primary' };
  if (score >= 50) return { label: 'Uneven', color: 'warning' };
  return { label: 'Poor', color: 'danger' };
}
