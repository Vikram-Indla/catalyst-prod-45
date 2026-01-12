/**
 * Test Case Detail Types - Section 3
 * Complete type system for test case detail, steps, attachments, linked items
 */

import { z } from 'zod';

// =============================================
// ENUMS
// =============================================

export const TestCaseTypeEnum = z.enum([
  'functional',
  'regression',
  'smoke',
  'e2e',
  'integration',
  'performance',
  'security',
  'usability',
]);
export type TestCaseTypeEnum = z.infer<typeof TestCaseTypeEnum>;

export const TestCasePriority = z.enum(['critical', 'high', 'medium', 'low']);
export type TestCasePriority = z.infer<typeof TestCasePriority>;

export const TestCaseStatusEnum = z.enum([
  'draft',
  'ready',
  'approved',
  'deprecated',
  'archived',
]);
export type TestCaseStatusEnum = z.infer<typeof TestCaseStatusEnum>;

export const ExecutionStatusEnum = z.enum([
  'passed',
  'failed',
  'blocked',
  'skipped',
  'not_run',
]);
export type ExecutionStatusEnum = z.infer<typeof ExecutionStatusEnum>;

export const StepStatusEnum = z.enum(['passed', 'failed', 'blocked', 'skipped']);
export type StepStatusEnum = z.infer<typeof StepStatusEnum>;

export const AttachmentTypeEnum = z.enum(['image', 'document', 'video', 'other']);
export type AttachmentTypeEnum = z.infer<typeof AttachmentTypeEnum>;

export const EnvironmentEnum = z.enum(['development', 'staging', 'production']);
export type EnvironmentEnum = z.infer<typeof EnvironmentEnum>;

export const ActivityActionEnum = z.enum([
  'created',
  'updated',
  'status_changed',
  'assigned',
  'step_added',
  'step_updated',
  'step_deleted',
  'step_reordered',
  'attachment_added',
  'attachment_removed',
  'executed',
  'defect_linked',
  'defect_unlinked',
  'requirement_linked',
  'requirement_unlinked',
  'duplicated',
  'archived',
  'restored',
]);
export type ActivityActionEnum = z.infer<typeof ActivityActionEnum>;

// =============================================
// CONSTANTS
// =============================================

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 50;
export const AUTOSAVE_DELAY_MS = 2000;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

// =============================================
// SCHEMAS
// =============================================

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  storagePath: z.string(),
  url: z.string().url(),
  type: AttachmentTypeEnum,
  mimeType: z.string(),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  uploadedAt: z.string().datetime(),
  uploadedById: z.string().uuid(),
  uploadedByName: z.string().optional(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const TestStepDetailSchema = z.object({
  id: z.string().uuid(),
  testCaseId: z.string().uuid(),
  order: z.number().int().positive(),
  action: z.string().min(1).max(2000),
  expectedResult: z.string().min(1).max(2000),
  notes: z.string().max(1000).nullable().optional(),
  testData: z.string().nullable().optional(),
  attachments: z.array(AttachmentSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TestStepDetail = z.infer<typeof TestStepDetailSchema>;

export const LinkedRequirementSchema = z.object({
  id: z.string().uuid(),
  requirementId: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'approved', 'implemented']),
  linkedAt: z.string().datetime(),
  linkedById: z.string().uuid(),
  linkedByName: z.string().optional(),
});
export type LinkedRequirement = z.infer<typeof LinkedRequirementSchema>;

export const LinkedDefectSchema = z.object({
  id: z.string().uuid(),
  defectId: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  severity: z.enum(['blocker', 'critical', 'major', 'minor', 'trivial']),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'wont_fix']),
  stepId: z.string().uuid().nullable(),
  linkedAt: z.string().datetime(),
  linkedById: z.string().uuid(),
  linkedByName: z.string().optional(),
});
export type LinkedDefect = z.infer<typeof LinkedDefectSchema>;

export const StepResultSchema = z.object({
  id: z.string().uuid(),
  stepId: z.string().uuid(),
  status: StepStatusEnum,
  actualResult: z.string().max(2000).nullable().optional(),
  defectId: z.string().uuid().nullable(),
  defectKey: z.string().nullable().optional(),
});
export type StepResult = z.infer<typeof StepResultSchema>;

export const ExecutionResultSchema = z.object({
  id: z.string().uuid(),
  testCaseId: z.string().uuid(),
  cycleId: z.string().uuid().nullable(),
  cycleName: z.string().nullable(),
  status: ExecutionStatusEnum,
  environment: EnvironmentEnum.nullable(),
  duration: z.number().int().nonnegative().nullable(),
  notes: z.string().max(2000).nullable().optional(),
  stepResults: z.array(StepResultSchema).default([]),
  executedAt: z.string().datetime(),
  executedById: z.string().uuid(),
  executedByName: z.string(),
  executedByInitials: z.string(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

export const ActivityEntrySchema = z.object({
  id: z.string().uuid(),
  testCaseId: z.string().uuid(),
  action: ActivityActionEnum,
  description: z.string(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  createdById: z.string().uuid(),
  createdByName: z.string(),
  createdByInitials: z.string(),
});
export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;

export const UserBriefSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  initials: z.string().max(3),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
export type UserBrief = z.infer<typeof UserBriefSchema>;

export const FolderBriefSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().optional(),
  path: z.string().optional(),
});
export type FolderBrief = z.infer<typeof FolderBriefSchema>;

export const ReleaseBriefSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(['planned', 'active', 'at_risk', 'completed']),
});
export type ReleaseBrief = z.infer<typeof ReleaseBriefSchema>;

// =============================================
// TEST CASE DETAIL (Full Entity)
// =============================================

export const TestCaseDetailSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).nullable().optional(),
  type: TestCaseTypeEnum.nullable().optional(),
  priority: TestCasePriority.nullable().optional(),
  status: TestCaseStatusEnum,
  preconditions: z.string().max(2000).nullable().optional(),
  estimatedTime: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS).default([]),

  assigneeId: z.string().uuid().nullable(),
  assignee: UserBriefSchema.nullable(),

  folderId: z.string().uuid().nullable(),
  folder: FolderBriefSchema.nullable(),

  releaseId: z.string().uuid().nullable(),
  release: ReleaseBriefSchema.nullable(),

  priorityId: z.string().uuid().nullable().optional(),
  typeId: z.string().uuid().nullable().optional(),

  steps: z.array(TestStepDetailSchema).default([]),
  attachments: z.array(AttachmentSchema).default([]),
  linkedRequirements: z.array(LinkedRequirementSchema).default([]),
  linkedDefects: z.array(LinkedDefectSchema).default([]),

  executionCount: z.number().int().nonnegative().default(0),
  passRate: z.number().min(0).max(100).nullable(),
  lastExecutedAt: z.string().datetime().nullable(),
  executionHistory: z.array(ExecutionResultSchema).default([]),
  activities: z.array(ActivityEntrySchema).default([]),

  version: z.number().int().positive().default(1),

  createdAt: z.string().datetime(),
  createdById: z.string().uuid(),
  createdByName: z.string(),
  updatedAt: z.string().datetime(),
  updatedById: z.string().uuid(),
  updatedByName: z.string(),
});
export type TestCaseDetail = z.infer<typeof TestCaseDetailSchema>;

// =============================================
// FORM SCHEMAS
// =============================================

export const UpdateTestCaseFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(5000).nullable().optional(),
  type: TestCaseTypeEnum.nullable().optional(),
  priority: TestCasePriority.nullable().optional(),
  status: TestCaseStatusEnum,
  preconditions: z.string().max(2000).nullable().optional(),
  estimatedTime: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS).default([]),
  assigneeId: z.string().uuid().nullable(),
  folderId: z.string().uuid().nullable(),
  releaseId: z.string().uuid().nullable(),
  priorityId: z.string().uuid().nullable().optional(),
  typeId: z.string().uuid().nullable().optional(),
  version: z.number().int().positive(),
});
export type UpdateTestCaseForm = z.infer<typeof UpdateTestCaseFormSchema>;

export const CreateStepFormSchema = z.object({
  action: z.string().min(1, 'Action is required').max(2000),
  expectedResult: z.string().min(1, 'Expected result is required').max(2000),
  notes: z.string().max(1000).nullable().optional(),
  testData: z.string().nullable().optional(),
});
export type CreateStepForm = z.infer<typeof CreateStepFormSchema>;

export const UpdateStepFormSchema = CreateStepFormSchema.partial();
export type UpdateStepForm = z.infer<typeof UpdateStepFormSchema>;

// =============================================
// API TYPES
// =============================================

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface ConflictError {
  code: 'CONFLICT';
  message: string;
  details: {
    currentVersion: number;
    yourVersion: number;
    modifiedBy: string;
    modifiedAt: string;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// =============================================
// UI TYPES
// =============================================

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface StepDragItem {
  id: string;
  order: number;
}

export interface TestCaseDetailTab {
  id: 'steps' | 'attachments' | 'requirements' | 'defects' | 'history' | 'activity';
  label: string;
  count?: number;
}

// Helper to get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
