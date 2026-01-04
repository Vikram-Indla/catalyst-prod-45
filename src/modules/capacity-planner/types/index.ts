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
  assignment_id: string;
  assignment_name: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
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
  allocation: number;
  assignments: CapacityAssignment[];
  status: 'available' | 'healthy' | 'at_capacity' | 'over_allocated';
}

export type ViewType = 'cards' | 'table' | 'timeline' | 'assignments' | 'leveling';
export type PeriodType = 'weekly' | 'monthly' | 'quarterly';
export type GroupByType = 'none' | 'project' | 'department' | 'assignment';

// Catalyst V5 Design System Colors
export const CatalystColors = {
  brand: {
    blue: '#2563eb',
    blueHover: '#1d4ed8',
    blueBg: 'rgba(37, 99, 235, 0.08)',
    teal: '#0d9488',
    tealHover: '#0f766e',
    tealBg: 'rgba(13, 148, 136, 0.08)',
  },
  secondary: {
    olive: '#4d8b4d',
    bronze: '#8b7355',
    champagne: '#d4b896',
    green: '#22c55e',
  },
  status: {
    success: '#0d9488',
    successBg: 'rgba(13, 148, 136, 0.08)',
    warning: '#d97706',
    warningBg: 'rgba(217, 119, 6, 0.08)',
    danger: '#dc2626',
    dangerBg: 'rgba(220, 38, 38, 0.08)',
  },
};

export const ProjectColors: Record<string, string> = {
  'Digital Investor Portal': '#4d8b4d',
  'Industrial Marketplace': '#8b7355',
  'Industrial Platform Modernization': '#0d9488',
  'Mobile App Initiative': '#d4b896',
  default: '#6b7280',
};

export const DepartmentColors: Record<string, { bg: string; text: string; badge: string }> = {
  Product: { bg: 'bg-[#d4b896]', text: 'text-[#4a3f35]', badge: 'bg-[#d4b896]/15 text-[#c69c6d]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white', badge: 'bg-[#2563eb]/10 text-[#2563eb]' },
  Support: { bg: 'bg-[#4d8b4d]', text: 'text-white', badge: 'bg-[#5c7c5c]/15 text-[#5c7c5c]' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

export const getProjectColor = (projectName: string): string => {
  return ProjectColors[projectName] || ProjectColors.default;
};
