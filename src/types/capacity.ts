/**
 * Capacity & Allocation Planning Types
 * Per specification from LOVABLE-AI-PROMPT.md
 */

export interface Resource {
  id: string;
  name: string;
  initials: string;
  role: string;
  email?: string;
  primarySkill: 'Frontend' | 'Backend' | 'Full Stack' | 'DevOps' | 'QA' | 'Product' | 'Design' | 'Data';
  location: 'Onsite' | 'Offshore' | 'Hybrid';
  department: 'Engineering' | 'Product' | 'Design';
  capacity: number;
  startDate: string;
  allocations: Allocation[];
  createdAt: string;
  updatedAt: string;
}

export interface Allocation {
  id: string;
  resourceId: string;
  projectId: string;
  weekNumber: number;
  year: number;
  percentage: number;
  type: 'HARD' | 'SOFT';
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface WeekAllocation {
  weekNumber: number;
  year: number;
  projects: { projectId: string; percentage: number; type: 'HARD' | 'SOFT' }[];
  totalPercentage: number;
}

export interface CapacityProject {
  id: string;
  name: string;
  shortName: string;
  color: string;
  status: 'Active' | 'On Hold' | 'Completed';
}

export interface Vacancy {
  id: string;
  projectId: string;
  skill: string;
  proficiencyLevel: 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner';
  percentageNeeded: number;
  location: 'Onsite' | 'Offshore' | 'Any';
  startWeek: number;
  endWeek: number;
  year: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED';
}

export interface CapacityState {
  resources: Resource[];
  projects: CapacityProject[];
  vacancies: Vacancy[];
  currentWeek: number;
  startWeek: number;
  adminMode: boolean;
  gridChanges: Record<string, number>;
  activeFilters: CapacityFilterState;
  activeQuickFilters: string[];
}

export interface CapacityFilterState {
  resource?: string;
  department?: string;
  location?: string;
  skill?: string;
  project?: string;
  minPct?: number;
  maxPct?: number;
  type?: 'HARD' | 'SOFT';
}

export type CapacityQuickFilter = 
  | 'underallocated' 
  | 'overallocated' 
  | 'available' 
  | 'current-week' 
  | 'onsite' 
  | 'offshore';

export interface CopyWeekOptions {
  mode: 'all' | 'hard' | 'selected';
  selectedResources?: string[];
}

// Utility types for status
export type AllocationStatus = 'over' | 'full' | 'under';

export interface AllocationStatusInfo {
  status: AllocationStatus;
  label: string;
  colorClass: string;
}
