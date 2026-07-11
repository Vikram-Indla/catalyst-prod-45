/**
 * Capacity Planner Types
 * Enterprise Strategy Room - Capacity Planning Module
 * Updated for Time-Boxed Allocation Booking System
 */

export interface CapacityResource {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  department_id?: string | null;
  assignment_id?: string | null;
  assignmentName?: string | null;
  defaultCapacity?: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  // Contract date fields (from resource_inventory - realtime subscribed)
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  vendor_name?: string | null;
  // Country and location fields (from resource_inventory + resource_countries)
  country?: string | null;
  country_code?: string | null;
  country_flag_svg?: string | null;  // Flag URL from resource_countries.flag_svg
  location?: string | null;
  // Computed
  allocation?: number;
  assignments?: CapacityAssignment[];
  status?: 'available' | 'healthy' | 'at_capacity' | 'over_allocated';
}

export interface CapacityProject {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'completed' | 'on_hold';
  start_date?: string;
  end_date?: string;
}

export interface CapacityAssignment {
  id: string;
  user_id: string;
  project_id: string;
  epic_id?: string;
  feature_id?: string;
  story_id?: string;
  allocation_percentage: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  work_item_type: 'project' | 'epic' | 'feature' | 'story' | 'planned' | 'support' | 'bench';
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data
  user?: CapacityResource;
  project?: CapacityProject;
  profiles?: { name: string; avatar_url?: string };
  projects?: { name: string; code?: string };
}

// ============= TIME-BOXED ALLOCATION TYPES =============

/**
 * Resource allocation with date range for time-boxed booking
 */
export interface ResourceAllocation {
  id: string;
  resource_id: string;
  assignment_id: string;
  allocation_percent: number;
  start_date: string;           // ISO date string (YYYY-MM-DD)
  end_date: string;             // ISO date string (YYYY-MM-DD)
  status: 'committed' | 'forecast'; // Allocation status
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined fields
  assignment_name?: string;
  resource_name?: string;
  profile_id?: string;
  role_name?: string;           // Role of the resource
}

/**
 * Input for creating/editing allocation bookings
 */
export interface AllocationBookingInput {
  id?: string;                  // undefined for new, string for edit
  originalIds?: string[];       // All original DB IDs when merging consecutive records
  assignment_id: string;
  assignment_name: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
  status?: 'committed' | 'forecast';  // Allocation status
}

/**
 * Extended resource with time-boxed allocations
 */
export interface ResourceWithAllocations extends CapacityResource {
  allocations: ResourceAllocation[];
}

/**
 * Period for timeline view
 */
export interface TimelinePeriod {
  label: string;
  start: Date;
  end: Date;
}

// ============= EXISTING TYPES =============

export interface CapacityScenario {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'approved' | 'archived';
  time_scope: 'month' | 'quarter' | 'half_year' | 'year';
  start_date: string;
  end_date: string;
  baseline_snapshot?: Record<string, unknown>;
  modifications?: Record<string, unknown>;
  metrics?: ScenarioMetrics;
  created_at: string;
  updated_at: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface ScenarioMetrics {
  total_resources: number;
  avg_utilization: number;
  over_allocated_count: number;
  under_allocated_count: number;
  capacity_delta: number;
}

export interface AiRecommendation {
  id: string;
  type: 'rebalance' | 'hire' | 'reassign' | 'alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affected_resources: string[];
  suggested_action?: Record<string, unknown>;
}

export interface CapacitySummary {
  total: number;
  available: number;
  healthy: number;
  atCapacity: number;
  overAllocated: number;
  avgUtilization: number;
}

export interface ResourceMetric extends CapacityResource {
  allocation?: number;
  assignments?: CapacityAssignment[];
  status?: 'available' | 'healthy' | 'at_capacity' | 'over_allocated';
}

export type ViewType = 'cards' | 'table' | 'timeline' | 'assignments' | 'leveling';
export type PeriodType = 'weekly' | 'monthly' | 'quarterly';
export type GroupByType = 'none' | 'project' | 'department' | 'assignment';

// Catalyst V5 Design System Colors
export const CatalystColors = {
  brand: {
    blue: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
    blueHover: 'var(--ds-background-brand-bold-hovered)',
    blueBg: 'var(--ds-background-information)',
    teal: 'var(--ds-chart-teal-bold)',
    tealHover: 'var(--ds-chart-teal-bolder)',
    tealBg: 'var(--ds-background-success)',
  },
  secondary: {
    olive: 'var(--ds-chart-teal-bold)',
    bronze: 'var(--ds-background-success-bold)',
    champagne: 'var(--ds-text-brand)',
    green: 'var(--ds-text-success)',
  },
  status: {
    success: 'var(--ds-chart-teal-bold)',
    successBg: 'var(--ds-background-success)',
    warning: 'var(--ds-text-warning)',
    warningBg: 'var(--ds-background-warning)',
    danger: 'var(--ds-text-danger)',
    dangerBg: 'var(--ds-background-danger-bold)',
  },
};

export const ProjectColors: Record<string, string> = {
  'Digital Investor Portal': 'var(--ds-chart-teal-bold)',
  'Industrial Marketplace': 'var(--ds-background-success-bold)',
  'Industrial Platform Modernization': 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  'Mobile App Request': 'var(--ds-text-brand)',
  default: 'var(--ds-text-subtlest)',
};

export const DepartmentColors: Record<string, { bg: string; text: string; badge: string }> = {
  Product: { bg: 'bg-[var(--ds-text-brand)]', text: 'text-white', badge: 'bg-[var(--ds-text-brand)]/15 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]' },
  Delivery: { bg: 'bg-[var(--ds-chart-teal-bold)]', text: 'text-white', badge: 'bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]/10 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]' },
  Support: { bg: 'bg-[var(--ds-background-success-bold)]', text: 'text-white', badge: 'bg-[var(--ds-background-success-bold)]/15 text-[var(--ds-background-success-bold)]' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

export const getProjectColor = (projectName: string): string => {
  return ProjectColors[projectName] || ProjectColors.default;
};
