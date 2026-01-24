/**
 * UI Test Case Types
 * Consolidated from data/testCasesData.ts for proper type organization
 * 
 * ID CONTRACT:
 * - id: ALWAYS the database UUID (for DB operations)
 * - key: ALWAYS the display key like "INV-0001" (for UI display only)
 * - NEVER use key in Supabase .eq() filters - always use id (UUID)
 */

export interface TestCaseStep {
  id: string;
  step: number;
  action: string;
  expectedResult: string;
  testData?: string;
}

export interface TestCaseAssignee {
  name: string;
  avatar: string;
  color: 'blue' | 'teal' | 'gray';
}

export type TestCaseType = 
  | 'functional' 
  | 'regression' 
  | 'smoke' 
  | 'integration' 
  | 'e2e' 
  | 'performance' 
  | 'security' 
  | 'usability';
export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';
export type TestCaseStatus = 'draft' | 'ready' | 'approved' | 'deprecated';
export type TestCaseLastRun = 'passed' | 'failed' | 'not_run';

/**
 * UI TestCase - Used by components for display
 * Converted from TMTestCase via testCaseAdapter
 */
export interface TestCase {
  /** Database UUID - use for ALL DB operations */
  id: string;
  /** Display key like "INV-0001" - for UI display only, NEVER for DB queries */
  key?: string;
  title: string;
  release: string;
  type: TestCaseType;
  priority: TestCasePriority;
  status: TestCaseStatus;
  steps: number;
  lastRun: TestCaseLastRun;
  assignee: TestCaseAssignee;
  updated: string;
  // Folder information
  folderId?: string | null;
  folderName?: string | null;
  folderPath?: string | null;
  // Extended fields
  description?: string;
  preconditions?: string;
  postconditions?: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  automationStatus?: 'automated' | 'manual' | 'in_progress';
  testSteps?: TestCaseStep[];
}
