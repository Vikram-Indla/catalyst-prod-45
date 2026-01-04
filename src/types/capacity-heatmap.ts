/**
 * Catalyst V5 Capacity Heatmap Types
 * Production-ready types for enterprise capacity planning
 */

export const CATALYST_COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',
  teal: '#0d9488',
  tealDark: '#0f766e',
  tealLight: '#14b8a6',
  warning: '#d97706',
  warningDark: '#b45309',
  danger: '#ef4444',
  dangerDark: '#dc2626',
} as const;

export type UtilizationStatus = 'available' | 'light' | 'moderate' | 'optimal' | 'at-capacity' | 'over-allocated';
export type ViewMode = 'standard' | 'thermal';
export type ZoomLevel = 'organization' | 'department' | 'team' | 'individual';
export type HealthStatus = 'critical' | 'stressed' | 'healthy' | 'underutilized';

export interface ProjectAllocation {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  percentage: number;
  startDate: string;
  endDate: string;
}

export interface MonthlyUtilization {
  month: Date;
  percentage: number;
  status: UtilizationStatus;
  allocations: ProjectAllocation[];
  isConflict: boolean;
  previousPeriodPercentage?: number;
}

export interface HeatmapResource {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  department: string;
  team: string;
  avatar?: string;
  monthlyUtilization: MonthlyUtilization[];
  averageUtilization: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  hasConflicts: boolean;
  conflictCount: number;
}

export interface HeatmapGroup {
  id: string;
  name: string;
  type: 'department' | 'team';
  resources: HeatmapResource[];
  aggregateUtilization: MonthlyUtilization[];
  averageUtilization: number;
  resourceCount: number;
  conflictCount: number;
  isExpanded: boolean;
}

export interface Conflict {
  id: string;
  resourceId: string;
  resourceName: string;
  month: Date;
  percentage: number;
  overBy: number;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'trend' | 'recommendation';
  title: string;
  description: string;
  actionLabel?: string;
  resourceIds?: string[];
  dismissed: boolean;
}

export interface OrgStats {
  overallUtilization: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  conflictCount: number;
  conflicts: Conflict[];
  availableCapacity: number;
  totalResources: number;
  healthStatus: HealthStatus;
  pulseRate: number;
}

export interface GhostAllocation {
  id: string;
  resourceId: string;
  month: Date;
  percentage: number;
  projectName: string;
  projectColor: string;
}

export interface UndoAction {
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface HeatmapFilters {
  departments: string[];
  utilizationRange: [number, number];
  showOnlyConflicts: boolean;
}

export interface SelectedCell {
  resourceId: string;
  month: Date;
}

export interface HoveredCell {
  resourceId: string;
  month: Date;
}
