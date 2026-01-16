/**
 * Types for Project Capacity View - Catalyst View 2
 * Period-based project staffing visualization
 */

export type PeriodType = 'weekly' | 'monthly';

export interface ProjectPeriodState {
  periodType: PeriodType;
  currentDate: Date;
  searchQuery: string;
}

export interface ProjectAllocation {
  id: string;
  resource_id?: string;
  profile_id?: string;
  resource_name?: string;
  profile_name?: string;
  role_name?: string;
  assignment_id?: string;
  assignment_name?: string;
  allocation_percent: number;
  allocation_type?: 'committed' | 'forecast';
  start_date: string;
  end_date: string;
  department?: string;
}

export interface ProjectAssignment {
  id: string;
  name: string;
  color?: string;
  required_fte?: number;
}

export interface ResourceInPeriod {
  resource_id: string;
  resource_name: string;
  role_name?: string;
  department?: string;
  committed: number;
  forecast: number;
  total: number;
}

export interface ProjectUtilization {
  project: ProjectAssignment;
  totalCommitted: number;
  totalForecast: number;
  totalFTE: number;
  requiredFTE: number;
  resources: ResourceInPeriod[];
  deptBreakdown: Record<string, number>;
  status: 'full' | 'partial' | 'under' | 'over';
}

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
  shortLabel: string;
  days: number;
}

export interface ProjectStaffingStats {
  total: number;
  fullyStaffed: number;
  partiallyStaffed: number;
  understaffed: number;
  overstaffed: number;
}
