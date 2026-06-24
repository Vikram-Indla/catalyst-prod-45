/**
 * Resource Allocation Types
 * Type definitions for the Linear/Notion-style Resource Allocation Timeline
 * Catalyst V5 Enterprise Design System
 */

// ============================================
// Base Types
// ============================================

export type PeriodType = 'weekly' | 'monthly';
export type AllocationStatus = 'committed' | 'forecast';
export type VisualState = 'actual' | 'committed' | 'forecast';
export type TimelineView = 'weeks' | 'months';

// ============================================
// Resource (from resource_inventory)
// ============================================

export interface AllocationResource {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  vendor: string;
  country: string;
  location: string;
  contractStart: string;  // ISO date
  contractEnd: string;    // ISO date
  forecastBoundary: string; // ISO date
  profileId?: string;
  avatarUrl?: string | null;
}

// ============================================
// Assignment (from resource_assignments / projects)
// ============================================

export interface Assignment {
  id: string;
  name: string;
  color: string; // Hex color for timeline bar
}

export interface AssignmentWithAllocation extends Assignment {
  startDate: string;
  endDate: string;
  percentage: number;
  status: AllocationStatus;
}

// ============================================
// Allocation (from resource_allocations)
// ============================================

export interface Allocation {
  id: string;
  resourceId: string;
  assignmentId: string;
  startDate: string;
  endDate: string;
  percentage: number;
  status: AllocationStatus;
}

// Weekly allocation (virtual for grid display)
export interface WeeklyAllocation {
  id: string;
  resourceId: string;
  assignmentId: string;
  weekStart: string;
  percentage: number;
  status: AllocationStatus;
}

// ============================================
// Timeline Period (column in the grid)
// ============================================

export interface TimelinePeriod {
  id: string;
  type: PeriodType;
  label: string;           // "W3" or "Jan"
  shortLabel: string;      // "Jan 13-19" or "January 2026"
  date: string;            // Start date of period
  weekNumber?: number;
  monthNumber?: number;
  year: number;
  isCurrent: boolean;
  isPast: boolean;
  isForecast: boolean;
}

// ============================================
// Timeline Bar (horizontal bar in the grid)
// ============================================

export interface TimelineBar {
  allocationId: string;
  originalIds: string[];
  assignmentId: string;
  assignmentName: string;
  assignmentColor: string;
  startIndex: number;
  endIndex: number;
  spanCount: number;
  percentage: number;
  status: AllocationStatus;
  startDate: string;
  endDate: string;
  /**
   * Fraction (0..1] of the last visible period cell to fill.
   * Used to visually stop bars mid-cell when contract ends mid-month/week.
   */
  endFraction?: number;
}

// ============================================
// Capacity per Period
// ============================================

export interface PeriodCapacity {
  periodId: string;
  periodDate: string;
  total: number;
  committed: number;
  forecast: number;
  status: 'ok' | 'full' | 'over';
}

// ============================================
// Week Column (legacy, for backward compat)
// ============================================

export interface WeekColumn {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  label: string;
  dateRange: string;
  isPast: boolean;
  isCurrent: boolean;
  isForecast: boolean;
}

// ============================================
// Validation
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WeekValidation {
  weekStart: string;
  committedTotal: number;
  forecastTotal: number;
  grandTotal: number;
  available: number;
  isOverCommitted: boolean;
  isOverForecasted: boolean;
}

// ============================================
// Form Types
// ============================================

export interface CreateAllocationInput {
  resource_id: string;
  assignment_id: string;
  period_type: PeriodType;
  start_week?: number;
  end_week?: number;
  start_month?: number;
  end_month?: number;
  start_year: number;
  end_year: number;
  allocation_percentage: number;
  status: AllocationStatus;
  notes?: string;
}

export interface UpdateAllocationInput extends Partial<CreateAllocationInput> {
  id: string;
}

// ============================================
// Component Props
// ============================================

export interface ResourceAllocationModalProps {
  resource: AllocationResource;
  onClose: () => void;
  onSave?: () => void;
}

export interface AddAssignmentModalProps {
  resourceId: string;
  resourceName: string;
  existingAssignmentIds: string[];
  onAdd: (data: CreateAllocationInput) => Promise<void>;
  onClose: () => void;
  defaultView?: TimelineView;
}

export interface TimelineGridProps {
  allocations: Allocation[];
  assignments: Assignment[];
  periods: TimelinePeriod[];
  view: TimelineView;
  onEditAllocation: (allocationId: string) => void;
  onDeleteAllocation: (allocationId: string) => void;
}

// ============================================
// Constants
// ============================================

// Assignment colors (cycle through for different projects)
export const ASSIGNMENT_COLORS: string[] = [
  'var(--cp-workstream-catalyst-primary, #2563eb)', // Blue
  'var(--ds-chart-teal-bold, #0d9488)', // Teal
  'var(--ds-background-discovery-bold, #7C3AED)', // Purple
  'var(--ds-background-warning-bold, #E2B203)', // Orange
  'var(--ds-background-accent-magenta-bolder, #BE185D)', // Pink
  'var(--quality-high, #059669)', // Emerald
  'var(--ds-background-discovery-bold, #8b5cf6)', // Violet
];

// Named colors for legacy compat
export const ASSIGNMENT_COLOR_MAP: Record<string, string> = {
  primary: 'var(--cp-workstream-catalyst-primary, #2563eb)',
  teal: 'var(--ds-chart-teal-bold, #0d9488)',
  orange: 'var(--ds-background-warning-bold, #E2B203)',
  purple: 'var(--ds-background-discovery-bold, #7C3AED)',
  pink: 'var(--ds-background-accent-magenta-bolder, #BE185D)',
  emerald: 'var(--quality-high, #059669)',
  violet: 'var(--ds-background-discovery-bold, #8b5cf6)',
};

// Department gradients for avatars
export const DEPARTMENT_GRADIENTS: Record<string, string> = {
  Delivery: 'linear-gradient(145deg, var(--ds-background-information-bold, #3b82f6), var(--cp-workstream-catalyst-primary, #2563eb))',
  Product: 'linear-gradient(145deg, var(--ds-background-discovery-bold, #8b5cf6), var(--ds-background-discovery-bold, #7C3AED))',
  Operations: 'linear-gradient(145deg, var(--ds-background-warning-bold, #f97316), var(--ds-background-warning-bold, #E2B203))',
  'Technical Support': 'linear-gradient(145deg, var(--ds-background-accent-teal-bolder, #14b8a6), var(--ds-chart-teal-bold, #0d9488))',
  Support: 'linear-gradient(145deg, var(--ds-background-accent-teal-bolder, #14b8a6), var(--ds-chart-teal-bold, #0d9488))',
  Engineering: 'linear-gradient(145deg, var(--ds-icon-information, #1D7AFC), var(--ds-link, #0C66E4))',
  Design: 'linear-gradient(145deg, var(--ds-background-accent-magenta-bolder, #ec4899), var(--ds-background-accent-magenta-bolder, #BE185D))',
};

// Get gradient for department (with fallback)
export function getDepartmentGradient(department: string): string {
  return DEPARTMENT_GRADIENTS[department] || DEPARTMENT_GRADIENTS.Delivery;
}

// Get color at index (cycles through)
export function getColorAtIndex(index: number): string {
  return ASSIGNMENT_COLORS[index % ASSIGNMENT_COLORS.length];
}
