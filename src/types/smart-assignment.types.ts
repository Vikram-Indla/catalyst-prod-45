/**
 * Type definitions for Smart Assignment Engine
 */

export interface AssignmentWeights {
  workload: number;      // 0-1, default 0.30
  skill: number;         // 0-1, default 0.35
  performance: number;   // 0-1, default 0.20
  availability: number;  // 0-1, default 0.15
}

export interface FactorScore {
  score: number;
  reason: string;
}

export interface AssignmentFactors {
  workload: FactorScore;
  skill: FactorScore;
  performance: FactorScore;
  availability: FactorScore;
}

export interface Assignment {
  testCaseId: string;
  assigneeId: string;
  score: number;
  factors: AssignmentFactors;
  adjusted?: boolean;
}

export interface TeamMemberSkill {
  module: string;
  level: number; // 1-5
  testsCompleted: number;
  avgExecutionTimeMinutes: number;
  passRate: number;
}

export interface TeamMemberAvailability {
  date: string;
  availableHours: number;
  isAvailable: boolean;
}

export interface SmartAssignmentTeamMember {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  currentAssignments: number;
  dailyCapacity: number;
  skills: Record<string, TeamMemberSkill>;
  availability: TeamMemberAvailability[];
}

export interface CycleContext {
  cycleId: string;
  startDate: string;
  endDate: string;
  remainingDays: number;
}

export interface TestCaseForAssignment {
  id: string;
  testCaseId: string;
  title: string;
  module: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration: number;
}

export interface WeightPreset {
  id: string;
  name: string;
  description: string;
  weights: AssignmentWeights;
}

export interface DistributionSummary {
  memberId: string;
  memberName: string;
  currentCount: number;
  proposedCount: number;
  totalCount: number;
  maxCapacity: number;
  isOverloaded: boolean;
  tests: TestCaseForAssignment[];
}
