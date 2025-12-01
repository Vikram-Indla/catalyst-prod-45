/**
 * CATALYST TESTS - Zod Validation Schemas
 * Phase 1 of 5: Database Foundation
 * 
 * These schemas validate test management data inputs.
 * Follow Catalyst's validation patterns for consistency.
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const testTypeSchema = z.enum(['manual', 'automated', 'bdd']);

export const testPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const testCaseStatusSchema = z.enum(['draft', 'approved', 'deprecated']);

export const testCycleStatusSchema = z.enum(['planned', 'in_progress', 'completed', 'cancelled']);

export const testExecutionStatusSchema = z.enum(['not_run', 'passed', 'failed', 'blocked', 'skipped']);

export const testStepStatusSchema = z.enum(['passed', 'failed', 'blocked', 'skipped']);

export const linkedWorkItemTypeSchema = z.enum(['story', 'feature', 'epic', 'task', 'defect']);

// ============================================
// TEST FOLDER SCHEMAS
// ============================================

export const createTestFolderSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Folder name is required')
    .max(255, 'Folder name must be less than 255 characters'),
  parentFolderId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  createdBy: z.string().uuid(),
});

export const updateTestFolderSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Folder name is required')
    .max(255, 'Folder name must be less than 255 characters')
    .optional(),
  parentFolderId: z.string().uuid().optional().nullable(),
});

// ============================================
// TEST CASE SCHEMAS
// ============================================

export const createTestCaseSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Test case title is required')
    .max(500, 'Title must be less than 500 characters'),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  expectedResult: z.string().optional(),
  testType: testTypeSchema.default('manual'),
  priority: testPrioritySchema.default('medium'),
  status: testCaseStatusSchema.default('draft'),
  folderId: z.string().uuid().optional(),
  linkedWorkItemType: linkedWorkItemTypeSchema.optional(),
  linkedWorkItemId: z.string().uuid().optional(),
  createdBy: z.string().uuid(),
}).refine(
  (data) => {
    // Both linkedWorkItemType and linkedWorkItemId must be present or both absent
    const hasType = !!data.linkedWorkItemType;
    const hasId = !!data.linkedWorkItemId;
    return hasType === hasId;
  },
  {
    message: 'linkedWorkItemType and linkedWorkItemId must both be provided or both omitted',
    path: ['linkedWorkItemType'],
  }
);

export const updateTestCaseSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Test case title is required')
    .max(500, 'Title must be less than 500 characters')
    .optional(),
  description: z.string().optional().nullable(),
  preconditions: z.string().optional().nullable(),
  expectedResult: z.string().optional().nullable(),
  testType: testTypeSchema.optional(),
  priority: testPrioritySchema.optional(),
  status: testCaseStatusSchema.optional(),
  folderId: z.string().uuid().optional().nullable(),
  linkedWorkItemType: linkedWorkItemTypeSchema.optional().nullable(),
  linkedWorkItemId: z.string().uuid().optional().nullable(),
});

// ============================================
// TEST STEP SCHEMAS
// ============================================

export const createTestStepSchema = z.object({
  testCaseId: z.string().uuid(),
  stepOrder: z.number().int().positive('Step order must be positive'),
  action: z.string()
    .trim()
    .min(1, 'Test step action is required'),
  expectedResult: z.string().optional(),
});

export const updateTestStepSchema = z.object({
  stepOrder: z.number().int().positive('Step order must be positive').optional(),
  action: z.string()
    .trim()
    .min(1, 'Test step action is required')
    .optional(),
  expectedResult: z.string().optional().nullable(),
});

// ============================================
// TEST SET SCHEMAS
// ============================================

export const createTestSetSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Test set name is required')
    .max(255, 'Test set name must be less than 255 characters'),
  description: z.string().optional(),
  teamId: z.string().uuid().optional(),
  createdBy: z.string().uuid(),
});

export const updateTestSetSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Test set name is required')
    .max(255, 'Test set name must be less than 255 characters')
    .optional(),
  description: z.string().optional().nullable(),
});

// ============================================
// TEST SET CASE SCHEMAS
// ============================================

export const createTestSetCaseSchema = z.object({
  testSetId: z.string().uuid(),
  testCaseId: z.string().uuid(),
  caseOrder: z.number().int().positive().optional(),
});

// ============================================
// TEST CYCLE SCHEMAS
// ============================================

export const createTestCycleSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Test cycle name is required')
    .max(255, 'Test cycle name must be less than 255 characters'),
  description: z.string().optional(),
  sprintId: z.string().uuid().optional(),
  programIncrementId: z.string().uuid().optional(),
  status: testCycleStatusSchema.default('planned'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  createdBy: z.string().uuid(),
}).refine(
  (data) => {
    // If both dates are provided, startDate must be <= endDate
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  }
);

export const updateTestCycleSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Test cycle name is required')
    .max(255, 'Test cycle name must be less than 255 characters')
    .optional(),
  description: z.string().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
  programIncrementId: z.string().uuid().optional().nullable(),
  status: testCycleStatusSchema.optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

// ============================================
// TEST EXECUTION SCHEMAS
// ============================================

export const createTestExecutionSchema = z.object({
  testCaseId: z.string().uuid(),
  testCycleId: z.string().uuid(),
  executedBy: z.string().uuid(),
  executionDate: z.coerce.date().default(() => new Date()),
  status: testExecutionStatusSchema.default('not_run'),
  actualResult: z.string().optional(),
  defectId: z.string().uuid().optional(),
  executionTimeSeconds: z.number().int().nonnegative('Execution time must be non-negative').optional(),
});

export const updateTestExecutionSchema = z.object({
  status: testExecutionStatusSchema.optional(),
  actualResult: z.string().optional().nullable(),
  defectId: z.string().uuid().optional().nullable(),
  executionTimeSeconds: z.number().int().nonnegative('Execution time must be non-negative').optional().nullable(),
});

// ============================================
// TEST EXECUTION STEP SCHEMAS
// ============================================

export const createTestExecutionStepSchema = z.object({
  testExecutionId: z.string().uuid(),
  testStepId: z.string().uuid(),
  status: testStepStatusSchema,
  actualResult: z.string().optional(),
  screenshotUrl: z.string().url('Screenshot URL must be valid').optional(),
});

export const updateTestExecutionStepSchema = z.object({
  status: testStepStatusSchema.optional(),
  actualResult: z.string().optional().nullable(),
  screenshotUrl: z.string().url('Screenshot URL must be valid').optional().nullable(),
});

// ============================================
// BULK OPERATION SCHEMAS
// ============================================

export const bulkAddTestCasesToSetSchema = z.object({
  testSetId: z.string().uuid(),
  testCaseIds: z.array(z.string().uuid()).min(1, 'At least one test case must be selected'),
});

export const bulkExecuteTestsSchema = z.object({
  testCycleId: z.string().uuid(),
  testCaseIds: z.array(z.string().uuid()).min(1, 'At least one test case must be selected'),
  executedBy: z.string().uuid(),
});