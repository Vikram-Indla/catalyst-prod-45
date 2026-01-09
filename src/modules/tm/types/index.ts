/**
 * Test Management Module - TypeScript Types
 * Clean, spec-compliant type definitions
 */

// === Enums as Types ===
export type TestCaseStatus = 'draft' | 'ready' | 'approved' | 'deprecated';
export type TestCasePriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TestCaseType = 'functional' | 'negative' | 'security' | 'edge' | 'integration' | 'api' | 'performance' | 'accessibility';
export type AutomationStatus = 'manual' | 'automated' | 'planned';

// === Folder Types ===
export interface TMFolder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TMFolderNode extends TMFolder {
  children: TMFolderNode[];
  testCaseCount: number;
  expanded?: boolean;
}

export interface FolderCreateInput {
  name: string;
  parentId?: string | null;
}

export interface FolderUpdateInput {
  id: string;
  name: string;
}

// === Test Case Types ===
export interface TMTestCase {
  id: string;
  folderId: string | null;
  key: string;
  title: string;
  description: string | null;
  status: TestCaseStatus;
  priority: TestCasePriority;
  type: TestCaseType;
  estimatedTime: number | null;
  automationStatus: AutomationStatus;
  tags: string[] | null;
  assigneeId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TMTestCaseWithMeta extends TMTestCase {
  assignee?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  stepCount: number;
  lastRunResult?: 'passed' | 'failed' | 'blocked' | 'skipped' | null;
}

export interface TestCaseCreateInput {
  title: string;
  folderId?: string | null;
  description?: string;
  priority?: TestCasePriority;
  type?: TestCaseType;
  status?: TestCaseStatus;
  assigneeId?: string | null;
  tags?: string[];
}

export interface TestCaseUpdateInput extends Partial<TestCaseCreateInput> {
  id: string;
}

// === AI Generation Types ===
export interface AIGenerateRequest {
  requirement: string;
  testTypes: TestCaseType[];
  coverage: 'minimal' | 'standard' | 'comprehensive';
  folderId?: string;
}

export interface AIGeneratedTestCase {
  title: string;
  type: TestCaseType;
  priority: TestCasePriority;
  description?: string;
  estimatedSteps?: number;
}

export interface AIGenerateResponse {
  testCases: AIGeneratedTestCase[];
  tokensUsed: number;
  cached: boolean;
}

// === UI State Types ===
export interface TMTableColumn {
  id: string;
  label: string;
  width?: number;
  sortable?: boolean;
  visible?: boolean;
}

export interface TMSortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TMFilterState {
  search: string;
  folderId: string | null;
  status: TestCaseStatus[];
  priority: TestCasePriority[];
  type: TestCaseType[];
}

// === Status/Priority/Type Display Config ===
export const STATUS_CONFIG: Record<TestCaseStatus, { label: string; color: string; bgClass: string }> = {
  draft: { label: 'Draft', color: 'text-muted-foreground', bgClass: 'bg-muted' },
  ready: { label: 'Ready', color: 'text-blue-600', bgClass: 'bg-blue-100 dark:bg-blue-900/30' },
  approved: { label: 'Approved', color: 'text-emerald-600', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30' },
  deprecated: { label: 'Deprecated', color: 'text-amber-600', bgClass: 'bg-amber-100 dark:bg-amber-900/30' },
};

export const PRIORITY_CONFIG: Record<TestCasePriority, { label: string; color: string; bgClass: string }> = {
  P1: { label: 'P1 - Critical', color: 'text-red-600', bgClass: 'bg-red-100 dark:bg-red-900/30' },
  P2: { label: 'P2 - High', color: 'text-orange-600', bgClass: 'bg-orange-100 dark:bg-orange-900/30' },
  P3: { label: 'P3 - Medium', color: 'text-blue-600', bgClass: 'bg-blue-100 dark:bg-blue-900/30' },
  P4: { label: 'P4 - Low', color: 'text-slate-500', bgClass: 'bg-slate-100 dark:bg-slate-800' },
};

export const TYPE_CONFIG: Record<TestCaseType, { label: string; icon?: string }> = {
  functional: { label: 'Functional' },
  negative: { label: 'Negative' },
  security: { label: 'Security' },
  edge: { label: 'Edge Case' },
  integration: { label: 'Integration' },
  api: { label: 'API' },
  performance: { label: 'Performance' },
  accessibility: { label: 'Accessibility' },
};
