/**
 * Workload Dashboard Types - Catalyst V5
 */

export interface TeamMemberWorkload {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  needsAttention: number;
  totalEstimatedMinutes: number;
  dailyCapacity: number;
  availableHoursToday: number;
  utilization: number; // percentage
  isAvailable: boolean;
  cycleBreakdown: CycleAssignment[];
}

export interface CycleAssignment {
  cycleId: string;
  cycleName: string;
  testCount: number;
  status: 'active' | 'paused' | 'completed';
}

export interface WorkloadSummary {
  totalMembers: number;
  availableToday: number;
  totalTestsAssigned: number;
  totalPending: number;
  totalInProgress: number;
  totalCompleted: number;
  atRiskCount: number;
  overallUtilization: number;
}

export interface WorkloadHealth {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  overloadedCount: number;
  underutilizedCount: number;
  imbalanceScore: number;
  suggestions: string[];
}

export interface WorkloadAlert {
  id: string;
  type: 'overloaded' | 'underutilized' | 'deadline_risk' | 'availability_gap';
  severity: 'warning' | 'danger';
  memberId: string;
  memberName: string;
  message: string;
  count?: number;
  actionLabel: string;
  date?: string;
}

export interface WorkloadFilters {
  cycleId?: string;
  dateRange: 'this_week' | 'next_two_weeks' | 'this_month';
  memberId?: string;
}

export interface AvailabilityCell {
  userId: string;
  userName: string;
  date: string;
  availableHours: number;
  isAvailable: boolean;
  notes?: string;
  testsDue: number;
  workloadLevel: 'low' | 'medium' | 'high' | 'overloaded';
}

export interface AvailabilityRow {
  userId: string;
  userName: string;
  initials: string;
  avatarUrl?: string;
  cells: AvailabilityCell[];
}

export interface CycleWorkload {
  cycleId: string;
  cycleName: string;
  status: string;
  totalTests: number;
  assignees: number;
  endDate: string;
  urgency: 'overdue' | 'due_soon' | 'on_track';
  memberDistribution: { memberId: string; memberName: string; count: number }[];
}

export interface WorkloadTrendPoint {
  date: string;
  assigned: number;
  completed: number;
}

export interface RebalanceTransfer {
  testId: string;
  testTitle: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
}

export interface RebalancePreview {
  transfers: RebalanceTransfer[];
  beforeDistribution: { userId: string; name: string; count: number }[];
  afterDistribution: { userId: string; name: string; count: number }[];
  improvementScore: number;
}
