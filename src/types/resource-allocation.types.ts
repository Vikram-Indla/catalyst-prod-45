/**
 * Resource Allocation Types
 * Type definitions for the Resource Allocation View
 * Catalyst V5 Enterprise Design System
 */

// Resource (from Contract Horizon)
export interface AllocationResource {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: 'Delivery' | 'Product' | 'Operations' | 'Technical Support' | string;
  vendor: string;
  country: string;
  location: 'On-site' | 'Off-shore' | string;
  contractStart: string;  // ISO date
  contractEnd: string;    // ISO date
  forecastBoundary: string; // ISO date - when forecast period begins
  profileId?: string;
}

// Assignment (project/program)
export interface Assignment {
  id: string;
  name: string;
  color: 'primary' | 'teal' | 'orange' | 'purple';
}

// Allocation status
export type AllocationStatus = 'committed' | 'forecast';

// Computed visual state (not stored)
export type VisualState = 'actual' | 'committed' | 'forecast';

// Allocation entry
export interface Allocation {
  id: string;
  resourceId: string;
  assignmentId: string;
  weekStart: string;      // ISO date (Monday of the week)
  percentage: number;     // 0-100
  status: AllocationStatus;
}

// Week column data
export interface WeekColumn {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  label: string;          // "W3"
  dateRange: string;      // "Jan 13-19"
  isPast: boolean;
  isCurrent: boolean;
  isForecast: boolean;
}

// Validation result per week
export interface WeekValidation {
  weekStart: string;
  committedTotal: number;
  forecastTotal: number;
  grandTotal: number;
  available: number;      // 100 - committedTotal
  isOverCommitted: boolean;  // committedTotal > 100
  isOverForecasted: boolean; // grandTotal > 100 but committedTotal <= 100
}

// State for the allocation view
export interface AllocationViewState {
  resource: AllocationResource;
  assignments: Assignment[];
  allocations: Allocation[];
  visibleWeeks: WeekColumn[];
  weekOffset: number;      // For timeline navigation
  editingCell: {
    assignmentId: string;
    weekStart: string;
  } | null;
  isDirty: boolean;        // Has unsaved changes
  isSaving: boolean;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Assignment colors
export const ASSIGNMENT_COLORS: Record<string, string> = {
  primary: '#2563eb',   // Blue - Default/first assignment
  teal: '#0d9488',      // Teal - Second assignment
  orange: '#ea580c',    // Orange - Third assignment
  purple: '#7c3aed',    // Purple - Fourth assignment
};

// Department gradients for avatars
export const DEPARTMENT_GRADIENTS: Record<string, string> = {
  Delivery: 'linear-gradient(145deg, #3b82f6, #2563eb)',
  Product: 'linear-gradient(145deg, #8b5cf6, #7c3aed)',
  Operations: 'linear-gradient(145deg, #f97316, #ea580c)',
  'Technical Support': 'linear-gradient(145deg, #14b8a6, #0d9488)',
  Support: 'linear-gradient(145deg, #14b8a6, #0d9488)',
};
