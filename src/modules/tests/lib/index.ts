/**
 * Tests Module Library
 * Centralized utilities and pipeline for all Tests operations
 */

export {
  // Pipeline
  runMutationWithAudit,
  assertPermission,
  checkPermission,
  createPipelineContext,
  
  // Error handling
  standardErrorMapper,
  getErrorMessage,
  PipelineError,
  
  // Validation
  validateRequired,
  validateLength,
  
  // Types
  type PermissionAction,
  type ScopeType,
  type TestEntityType,
  type ActivityType,
  type PipelineContext,
  type AuditLogInput,
  type MutationResult,
  type MutationOptions,
  type PipelineErrorType,
} from './actionPipeline';
