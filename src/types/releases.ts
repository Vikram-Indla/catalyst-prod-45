// =====================================================
// RELEASES MODULE TYPES
// Type definitions for the All Releases page
// =====================================================

export type ReleaseStatus = 'planning' | 'active' | 'uat' | 'released' | 'archived';
export type ReleaseHealth = 'healthy' | 'at_risk' | 'critical';

export interface Release {
  id: string;
  name: string;
  version: string;
  description: string | null;
  status: ReleaseStatus;
  
  start_date: string | null;
  target_date: string | null;
  release_date: string | null;
  
  progress: number;
  health: ReleaseHealth;
  
  is_blocked: boolean;
  blocked_reason: string | null;
  
  owner_id: string | null;
  owner?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  
  project_id: string | null;
  release_vehicle_id: string;
  
  test_cases_total: number;
  test_cases_passed: number;
  defects_open: number;
  coverage_percent: number;
  
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  
  // Legacy fields
  readiness_pct: number | null;
  notes: string | null;
}

export interface ReleasesFilter {
  status: ReleaseStatus[];
  health: ReleaseHealth[];
  search: string;
}

export interface ReleasesSort {
  column: 'name' | 'status' | 'progress' | 'health' | 'target_date';
  direction: 'asc' | 'desc';
}

export type ViewMode = 'table' | 'timeline';

// Status display configuration
export const STATUS_CONFIG: Record<ReleaseStatus, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'bg-slate-100 text-slate-600' },
  active: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
  uat: { label: 'UAT', className: 'bg-amber-100 text-amber-700' },
  released: { label: 'Released', className: 'bg-teal-100 text-teal-700' },
  archived: { label: 'Archived', className: 'bg-slate-100 text-slate-400' },
};

// Health display configuration
export const HEALTH_CONFIG: Record<ReleaseHealth, { label: string; dotClass: string; textClass: string }> = {
  healthy: { label: 'Healthy', dotClass: 'bg-teal-500', textClass: 'text-slate-600' },
  at_risk: { label: 'At Risk', dotClass: 'bg-amber-500', textClass: 'text-amber-600' },
  critical: { label: 'Critical', dotClass: 'bg-red-500 animate-pulse', textClass: 'text-red-600 font-semibold' },
};
