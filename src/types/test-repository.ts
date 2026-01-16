/**
 * Test Repository Types
 * Based on Catalyst V5 Test Suites & Folders Specification
 */

// =====================================================
// FOLDER TYPES
// =====================================================

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string;
  sortOrder: number;
  testCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// =====================================================
// TEST SUITE TYPES
// =====================================================

export type SuiteStatus = 'active' | 'archived';

export interface TestSuite {
  id: string;
  name: string;
  folderId: string | null;
  projectId: string;
  ownerId: string;
  ownerName?: string;
  sortOrder: number;
  status: SuiteStatus;
  testCount: number;
  passedCount: number;
  failedCount: number;
  tags: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// =====================================================
// TEST CASE TYPES
// =====================================================

export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';
export type TestCaseStatus = 'draft' | 'ready' | 'needs-update';
export type TestRunResult = 'passed' | 'failed' | 'blocked' | 'skipped';

export interface TestStep {
  order: number;
  action: string;
  expectedResult: string;
}

export interface RepositoryTestCase {
  id: string;
  name: string;
  suiteId: string;
  sortOrder: number;
  priority: TestCasePriority;
  status: TestCaseStatus;
  preconditions?: string;
  description?: string;
  steps: TestStep[];
  linkedRequirements: string[];
  lastRunResult?: TestRunResult;
  lastRunDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// =====================================================
// TREE NODE TYPES
// =====================================================

export type TreeNodeType = 'folder' | 'suite';

export interface TreeNode {
  id: string;
  name: string;
  type: TreeNodeType;
  parentId: string | null;
  sortOrder: number;
  testCount: number;
  children?: TreeNode[];
  // Suite-specific
  status?: SuiteStatus;
  passedCount?: number;
  failedCount?: number;
}

// =====================================================
// DROP POSITION
// =====================================================

export type DropPosition = 'inside' | 'above' | 'below' | null;

// =====================================================
// STYLE CONFIGS
// =====================================================

export const PRIORITY_CONFIG: Record<TestCasePriority, { label: string; bgClass: string; textClass: string }> = {
  critical: { label: 'Critical', bgClass: 'bg-[#fee2e2]', textClass: 'text-[#dc2626]' },
  high: { label: 'High', bgClass: 'bg-[#fef3c7]', textClass: 'text-[#b45309]' },
  medium: { label: 'Medium', bgClass: 'bg-[#f1f5f9]', textClass: 'text-[#64748b]' },
  low: { label: 'Low', bgClass: 'bg-[#f1f5f9]', textClass: 'text-[#94a3b8]' },
};

export const STATUS_CONFIG: Record<TestCaseStatus, { label: string; bgClass: string; textClass: string }> = {
  draft: { label: 'Draft', bgClass: 'bg-[#f1f5f9]', textClass: 'text-[#64748b]' },
  ready: { label: 'Ready', bgClass: 'bg-[#ccfbf1]', textClass: 'text-[#0d9488]' },
  'needs-update': { label: 'Needs Update', bgClass: 'bg-[#fef3c7]', textClass: 'text-[#b45309]' },
};

export const RUN_RESULT_CONFIG: Record<TestRunResult, { label: string; bgClass: string; textClass: string }> = {
  passed: { label: 'Passed', bgClass: 'bg-[#ccfbf1]', textClass: 'text-[#0d9488]' },
  failed: { label: 'Failed', bgClass: 'bg-[#fee2e2]', textClass: 'text-[#dc2626]' },
  blocked: { label: 'Blocked', bgClass: 'bg-[#fef3c7]', textClass: 'text-[#b45309]' },
  skipped: { label: 'Skipped', bgClass: 'bg-[#f1f5f9]', textClass: 'text-[#64748b]' },
};
