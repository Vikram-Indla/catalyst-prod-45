/**
 * CreateEditTestPlanDialog - TypeScript Interfaces
 * GOD-TIER 9.8 Implementation
 */

import { TestPlanStatus } from '@/types/test-management';

// ============================================================
// FORM STATE TYPES
// ============================================================

export interface TestPlanFormState {
  // Tab 1: Basic Info
  name: string;
  description: string;
  status: TestPlanStatus;
  release_id: string | null;
  start_date: Date | null;
  end_date: Date | null;
  objectives: string;
  
  // Tab 2: Scope (requirement IDs)
  in_scope_ids: string[];
  out_of_scope: string;
  
  // Tab 3: Strategy
  test_strategy: string;
  environment_requirements: string;
  entry_criteria: string;
  exit_criteria: string;
  assumptions: string;
  risks: string;
  
  // Tab 4: Team
  owner_id: string | null;
  team_members: string[];
}

export interface TestPlanFormErrors {
  name?: string;
  description?: string;
  status?: string;
  release_id?: string;
  start_date?: string;
  end_date?: string;
  objectives?: string;
  owner_id?: string;
  team_members?: string;
}

export const initialFormState: TestPlanFormState = {
  name: '',
  description: '',
  status: 'draft',
  release_id: null,
  start_date: null,
  end_date: null,
  objectives: '',
  in_scope_ids: [],
  out_of_scope: '',
  test_strategy: '',
  environment_requirements: '',
  entry_criteria: '',
  exit_criteria: '',
  assumptions: '',
  risks: '',
  owner_id: null,
  team_members: [],
};

// ============================================================
// REQUIREMENT TYPES (for Scope tab)
// ============================================================

export interface ScopeRequirement {
  id: string;
  key: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  epic_name?: string;
  test_case_count: number;
}

export type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

// ============================================================
// TEAM MEMBER TYPES
// ============================================================

export interface TeamMemberOption {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
  specialty?: string;
  is_available: boolean;
  capacity_percent: number;
  active_plans_count: number;
}

// ============================================================
// COVERAGE STATS
// ============================================================

export interface CoverageStats {
  inScopeCount: number;
  existingTestsCount: number;
  gapCount: number;
  coveragePercent: number;
}

// ============================================================
// TAB CONFIGURATION
// ============================================================

export type TabId = 'basic' | 'scope' | 'strategy' | 'team';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
  badge?: number;
  hasError?: boolean;
}

// ============================================================
// DIALOG PROPS
// ============================================================

export interface CreateEditTestPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  editPlanId?: string; // If provided, we're editing
  onSuccess?: () => void;
}
