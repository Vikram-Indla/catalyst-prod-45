/**
 * Types for the Create Test Case Dialog
 * 9.8 GOD-TIER Specification
 */

import type { TestCaseType } from '@/types/test-cases';

export interface TestCaseStep {
  id: string;
  order: number;
  action: string;
  testData?: string;
  expectedResult: string;
  attachments: StepAttachment[];
  isComplete: boolean;
}

export interface StepAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface TestCaseParameter {
  id: string;
  values: Record<string, string>;
}

export interface TestCaseAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export type StepMode = 'classic' | 'bdd';
export type ReviewStatus = 'draft' | 'review' | 'approved';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
// Re-export canonical TestCaseType from central types
export type { TestCaseType } from '@/types/test-cases';

export interface TestCaseFormData {
  // Tab 1: Details
  title: string;
  description: string;
  type: TestCaseType;
  priority: PriorityLevel;
  folderId: string;
  assigneeId?: string;
  preconditions?: string;
  postconditions?: string;

  // Tab 2: Steps
  stepMode: StepMode;
  steps: TestCaseStep[];
  gherkinContent?: string;

  // Tab 3: Data
  parameters: TestCaseParameter[];
  parameterHeaders: string[];

  // Tab 4: Attachments
  attachments: TestCaseAttachment[];

  // Tab 5: Additional
  tags: string[];
  featureId?: string;
  storyId?: string;
  releaseId?: string;
  componentId?: string;
  isAutomated: boolean;
  estimatedTime?: number;
  automationId?: string;
  reviewStatus: ReviewStatus;
  customFields: Record<string, unknown>;
}

export const defaultFormData: TestCaseFormData = {
  title: '',
  description: '',
  type: 'functional',
  priority: 'P3',
  folderId: '',
  assigneeId: undefined,
  preconditions: '',
  postconditions: '',
  stepMode: 'classic',
  steps: [],
  gherkinContent: '',
  parameters: [],
  parameterHeaders: ['username', 'password', 'expected'],
  attachments: [],
  tags: [],
  featureId: undefined,
  storyId: undefined,
  releaseId: undefined,
  componentId: undefined,
  isAutomated: false,
  estimatedTime: undefined,
  automationId: undefined,
  reviewStatus: 'draft',
  customFields: {},
};

export interface TabInfo {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  hasError?: boolean;
  isComplete?: boolean;
}

export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; description: string; color: string }> = {
  P1: { label: 'P1 - Critical', description: 'Blocks release, immediate action', color: '#ef4444' },
  P2: { label: 'P2 - High', description: 'Important, address soon', color: '#f59e0b' },
  P3: { label: 'P3 - Medium', description: 'Normal priority', color: '#3b82f6' },
  P4: { label: 'P4 - Low', description: 'Nice to have', color: '#94a3b8' },
};

export const TYPE_OPTIONS: { value: TestCaseType; label: string }[] = [
  { value: 'functional', label: 'Functional' },
  { value: 'regression', label: 'Regression' },
  { value: 'smoke', label: 'Smoke' },
  { value: 'integration', label: 'Integration' },
  { value: 'e2e', label: 'End-to-End' },
  { value: 'performance', label: 'Performance' },
  { value: 'security', label: 'Security' },
  { value: 'usability', label: 'Usability' },
];
