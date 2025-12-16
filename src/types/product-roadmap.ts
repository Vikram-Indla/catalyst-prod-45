// Product Roadmap Types (Demand/Business Request focused)

export interface DemandOwner {
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

export interface Demand {
  id: string;
  key: string;
  title: string;
  status: DemandStatus;
  ownerId: string;
  ownerName: string;
  platform: string;
  startDate: Date;
  endDate: Date;
  rank: number | null;
  progress: number;
  milestones: DemandMilestone[];
}

export type Scale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TimeUnit {
  label: string;
  isCurrent: boolean;
}

// Filter state for demands (simplified - no KR conditions)
export interface DemandFilterState {
  status: string[];
  ownerIds: string[];
  platforms: string[];
}

export const EMPTY_DEMAND_FILTERS: DemandFilterState = {
  status: [],
  ownerIds: [],
  platforms: [],
};

export function countDemandFilterSelections(filters: DemandFilterState): number {
  return filters.status.length + filters.ownerIds.length + filters.platforms.length;
}

export function areDemandFiltersEqual(a: DemandFilterState, b: DemandFilterState): boolean {
  return (
    JSON.stringify([...a.status].sort()) === JSON.stringify([...b.status].sort()) &&
    JSON.stringify([...a.ownerIds].sort()) === JSON.stringify([...b.ownerIds].sort()) &&
    JSON.stringify([...a.platforms].sort()) === JSON.stringify([...b.platforms].sort())
  );
}

// Status display config
export const DEMAND_STATUS_CONFIG: { key: DemandStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#6b7280' },
  { key: 'analyse', label: 'Analyse', color: '#c69c6d' },
  { key: 'approved', label: 'Approved', color: '#5c7c5c' },
  { key: 'implement', label: 'Implement', color: '#8b7355' },
  { key: 'closed', label: 'Closed', color: '#374151' },
  { key: 'on-hold', label: 'On Hold', color: '#c75a4a' },
];
