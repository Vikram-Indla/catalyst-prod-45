export type TestSetType =
  | 'smoke' | 'regression' | 'sanity' | 'integration' | 'e2e'
  | 'performance' | 'security' | 'accessibility' | 'custom';

export type TestSetMembership = 'static' | 'dynamic';

export interface TestSet {
  id: string;
  set_key: string;
  name: string;
  description: string | null;
  set_type: TestSetType;
  membership_type: TestSetMembership;
  dynamic_criteria: DynamicCriteria | null;
  test_count: number;
  is_active: boolean;
  project_id: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  owner?: { id: string; full_name: string; avatar_url: string | null };
}

export interface DynamicCriteria {
  priority?: string[];
  tags?: string[];
  folder_id?: string;
}

export interface TestSetFilters {
  search: string;
  type: TestSetType | 'all';
  status: 'all' | 'active' | 'archived';
}

export interface CreateTestSetInput {
  name: string;
  description?: string;
  set_type: TestSetType;
  membership_type: TestSetMembership;
  dynamic_criteria?: DynamicCriteria;
  project_id: string;
  owner_id?: string;
  created_by?: string;
}

export interface UpdateTestSetInput {
  name: string;
  description?: string;
  set_type: TestSetType;
  membership_type: TestSetMembership;
  dynamic_criteria?: DynamicCriteria;
  owner_id?: string;
}

export const TEST_SET_TYPE_CONFIG: Record<TestSetType, { label: string; icon: string; color: string }> = {
  smoke: { label: 'Smoke', icon: 'Flame', color: '#f97316' },
  regression: { label: 'Regression', icon: 'RefreshCcw', color: '#8b5cf6' },
  sanity: { label: 'Sanity', icon: 'Target', color: '#06b6d4' },
  integration: { label: 'Integration', icon: 'Puzzle', color: '#3b82f6' },
  e2e: { label: 'E2E', icon: 'Route', color: '#10b981' },
  performance: { label: 'Performance', icon: 'Gauge', color: '#eab308' },
  security: { label: 'Security', icon: 'Shield', color: '#ef4444' },
  accessibility: { label: 'Accessibility', icon: 'Eye', color: '#6366f1' },
  custom: { label: 'Custom', icon: 'Layers', color: '#64748b' },
};
