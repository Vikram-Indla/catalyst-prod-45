// Product Roadmap Types (Demand/Business Request focused)

export interface DemandOwner {
  id: string;
  name: string;
  initials: string;
}

export interface DemandAssignee {
  id: string;
  name: string;
  initials: string;
}

export interface DemandMilestone {
  id: string;
  title: string;
  date: Date;
  status: 'complete' | 'current' | 'pending' | 'overdue';
  demandId?: string;
}

export type DemandStatus = 'new' | 'analyse' | 'approved' | 'implement' | 'closed' | 'on-hold';
export type PriorityTier = 'high' | 'medium' | 'low' | 'unscored';
export type HealthStatus = 'on-track' | 'at-risk' | 'off-track' | 'unknown';
export type MilestoneCondition = 'has-overdue' | 'all-complete' | 'no-milestones';
export type PlannedQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'unplanned';

export interface Demand {
  id: string;
  key: string;
  title: string;
  status: DemandStatus;
  ownerId: string;
  ownerName: string;
  assigneeId: string;
  assigneeName: string;
  platform: string;
  startDate: Date;
  endDate: Date;
  rank: number | null;
  progress: number;
  milestones: DemandMilestone[];
  // New filter fields
  plannedQuarter: PlannedQuarter;
  priorityTier: PriorityTier;
  health: HealthStatus;
}

export type Scale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TimeUnit {
  label: string;
  isCurrent: boolean;
}

// Enhanced filter state for demands
export interface DemandFilterState {
  status: string[];
  ownerIds: string[];
  platforms: string[];
  // New filter groups
  assigneeIds: string[];
  quarters: string[];
  priorityTiers: string[];
  health: string[];
  milestoneConditions: string[];
}

export const EMPTY_DEMAND_FILTERS: DemandFilterState = {
  status: [],
  ownerIds: [],
  platforms: [],
  assigneeIds: [],
  quarters: [],
  priorityTiers: [],
  health: [],
  milestoneConditions: [],
};

export function countDemandFilterSelections(filters: DemandFilterState): number {
  return (
    filters.status.length +
    filters.ownerIds.length +
    filters.platforms.length +
    filters.assigneeIds.length +
    filters.quarters.length +
    filters.priorityTiers.length +
    filters.health.length +
    filters.milestoneConditions.length
  );
}

export function areDemandFiltersEqual(a: DemandFilterState, b: DemandFilterState): boolean {
  return (
    JSON.stringify([...a.status].sort()) === JSON.stringify([...b.status].sort()) &&
    JSON.stringify([...a.ownerIds].sort()) === JSON.stringify([...b.ownerIds].sort()) &&
    JSON.stringify([...a.platforms].sort()) === JSON.stringify([...b.platforms].sort()) &&
    JSON.stringify([...a.assigneeIds].sort()) === JSON.stringify([...b.assigneeIds].sort()) &&
    JSON.stringify([...a.quarters].sort()) === JSON.stringify([...b.quarters].sort()) &&
    JSON.stringify([...a.priorityTiers].sort()) === JSON.stringify([...b.priorityTiers].sort()) &&
    JSON.stringify([...a.health].sort()) === JSON.stringify([...b.health].sort()) &&
    JSON.stringify([...a.milestoneConditions].sort()) === JSON.stringify([...b.milestoneConditions].sort())
  );
}

// Status display config
export const DEMAND_STATUS_CONFIG: { key: DemandStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#6b7280' },
  { key: 'analyse', label: 'Analyse', color: '#c69c6d' },
  { key: 'approved', label: 'Approved', color: '#5c7c5c' },
  { key: 'implement', label: 'In Progress', color: '#8b7355' },
  { key: 'closed', label: 'Completed', color: '#374151' },
  { key: 'on-hold', label: 'On Hold', color: '#c75a4a' },
];

// Priority tier display config
export const PRIORITY_TIER_CONFIG: { key: PriorityTier; label: string; color: string }[] = [
  { key: 'high', label: 'High', color: '#c75a4a' },
  { key: 'medium', label: 'Medium', color: '#c69c6d' },
  { key: 'low', label: 'Low', color: '#5c7c5c' },
  { key: 'unscored', label: 'Unscored', color: '#6b7280' },
];

// Health display config
export const HEALTH_CONFIG: { key: HealthStatus; label: string; color: string }[] = [
  { key: 'on-track', label: 'On Track', color: '#5c7c5c' },
  { key: 'at-risk', label: 'At Risk', color: '#c69c6d' },
  { key: 'off-track', label: 'Off Track', color: '#c75a4a' },
  { key: 'unknown', label: 'Unknown', color: '#6b7280' },
];

// Quarter config
export const QUARTER_CONFIG: { key: PlannedQuarter; label: string }[] = [
  { key: 'Q1', label: 'Q1' },
  { key: 'Q2', label: 'Q2' },
  { key: 'Q3', label: 'Q3' },
  { key: 'Q4', label: 'Q4' },
  { key: 'unplanned', label: 'Unplanned' },
];

// Milestone condition config
export const MILESTONE_CONDITION_CONFIG: { key: MilestoneCondition; label: string }[] = [
  { key: 'has-overdue', label: 'Has Overdue Milestones' },
  { key: 'all-complete', label: 'All Milestones Complete' },
  { key: 'no-milestones', label: 'No Milestones' },
];
