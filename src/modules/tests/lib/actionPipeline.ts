/**
 * Tests Action Pipeline
 * Centralized permission checking, mutation execution with audit logging,
 * and standardized error handling for all Tests module CTAs.
 */

import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'link' | 'move' | 'configure';
export type ScopeType = 'global' | 'portfolio' | 'program' | 'team' | 'project';

export type TestEntityType = 
  | 'test_cases'
  | 'test_sets' 
  | 'test_cycles'
  | 'test_executions'
  | 'test_folders'
  | 'test_steps';

export type ActivityType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'restored'
  | 'executed'
  | 'status_changed'
  | 'assigned'
  | 'linked'
  | 'unlinked'
  | 'cases_added'
  | 'cases_removed'
  | 'scope_locked'
  | 'scope_unlocked'
  | 'defect_created';

export interface PipelineContext {
  userId: string;
  scopeType: ScopeType;
  scopeId: string | null;
  programId?: string | null;
  projectId?: string | null;
}

export interface AuditLogInput {
  activityType: ActivityType;
  entityType: TestEntityType;
  entityId: string;
  entityTitle?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface MutationResult<T> {
  data: T;
  success: boolean;
}

export type PipelineErrorType = 
  | 'permission_denied'
  | 'validation_error'
  | 'not_found'
  | 'conflict'
  | 'unknown';

export class PipelineError extends Error {
  type: PipelineErrorType;
  details?: Record<string, unknown>;

  constructor(type: PipelineErrorType, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PipelineError';
    this.type = type;
    this.details = details;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PERMISSION CHECKING
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if user has permission to perform action on entity
 * Calls the check_permission RPC function
 * Throws PipelineError if permission denied
 */
export async function assertPermission(
  userId: string,
  action: PermissionAction,
  entityType: string,
  scopeType: ScopeType = 'global',
  scopeId?: string | null
): Promise<void> {
  try {
    // Check if user is admin first (fast path)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      return; // Admins bypass permission checks
    }

    // Map 'project' to 'program' for RPC since DB enum doesn't have 'project'
    const rpcScopeType = scopeType === 'project' ? 'program' : scopeType;

    const { data, error } = await supabase.rpc('check_permission', {
      _user_id: userId,
      _entity_type: entityType,
      _action: action,
      _scope_type: rpcScopeType as 'global' | 'portfolio' | 'program' | 'team',
      _scope_id: scopeId || null,
    });

    if (error) {
      console.error('Permission check error:', error);
      throw new PipelineError(
        'permission_denied',
        'Unable to verify permissions. Please try again.'
      );
    }

    if (!data) {
      throw new PipelineError(
        'permission_denied',
        `You don't have permission to ${action} ${entityType.replace(/_/g, ' ')}`
      );
    }
  } catch (err) {
    if (err instanceof PipelineError) throw err;
    console.error('Permission check failed:', err);
    throw new PipelineError(
      'permission_denied',
      'Permission check failed. Please try again.'
    );
  }
}

/**
 * Non-throwing version - returns boolean
 */
export async function checkPermission(
  userId: string,
  action: PermissionAction,
  entityType: string,
  scopeType: ScopeType = 'global',
  scopeId?: string | null
): Promise<boolean> {
  try {
    await assertPermission(userId, action, entityType, scopeType, scopeId);
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════

/**
 * Log activity to test_activity_log table
 * This is the single audit stream for all Tests module actions
 */
async function logTestActivity(
  context: PipelineContext,
  input: AuditLogInput
): Promise<void> {
  try {
    const insertData: Record<string, unknown> = {
      user_id: context.userId,
      activity_type: input.activityType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_title: input.entityTitle || null,
      description: input.description || null,
      program_id: context.programId || null,
      project_id: context.projectId || null,
      metadata: input.metadata || null,
    };
    await supabase.from('test_activity_log').insert(insertData as any);
  } catch (err) {
    // Audit logging should not fail the operation
    console.error('Failed to log test activity:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ERROR MAPPING
// ═══════════════════════════════════════════════════════════════════

/**
 * Map database/API errors to user-friendly messages
 */
export function standardErrorMapper(error: unknown): PipelineError {
  if (error instanceof PipelineError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('denied') || lowerMessage.includes('unauthorized')) {
    return new PipelineError('permission_denied', 'You don\'t have permission to perform this action');
  }

  // Validation errors
  if (lowerMessage.includes('required') || lowerMessage.includes('invalid') || lowerMessage.includes('constraint')) {
    return new PipelineError('validation_error', message);
  }

  // Not found
  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    return new PipelineError('not_found', 'The requested item was not found');
  }

  // Conflict (duplicate key, etc)
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('unique') || lowerMessage.includes('conflict')) {
    return new PipelineError('conflict', 'This item already exists');
  }

  // Unknown error
  return new PipelineError('unknown', 'An unexpected error occurred. Please try again.');
}

/**
 * Get user-friendly error message for toast display
 */
export function getErrorMessage(error: unknown): string {
  const mapped = standardErrorMapper(error);
  return mapped.message;
}

// ═══════════════════════════════════════════════════════════════════
// MUTATION PIPELINE
// ═══════════════════════════════════════════════════════════════════

export interface MutationOptions<TInput, TResult> {
  /** Pipeline context with user and scope info */
  context: PipelineContext;
  
  /** Permission action to check */
  action: PermissionAction;
  
  /** Entity type for permission and audit */
  entityType: TestEntityType;
  
  /** The actual mutation function */
  mutationFn: (input: TInput) => Promise<TResult>;
  
  /** Extract entity info for audit log */
  getAuditInfo: (input: TInput, result: TResult) => {
    entityId: string;
    entityTitle?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };
  
  /** Activity type for audit log */
  activityType: ActivityType;
  
  /** Query keys to invalidate on success */
  invalidateKeys?: string[][];
  
  /** Success message for toast */
  successMessage?: string;
  
  /** Query client for invalidation */
  queryClient?: QueryClient;
}

/**
 * Run a mutation through the full pipeline:
 * 1. Assert permission
 * 2. Execute mutation
 * 3. Log to audit stream
 * 4. Invalidate queries
 * 5. Show toast feedback
 */
export async function runMutationWithAudit<TInput, TResult>(
  input: TInput,
  options: MutationOptions<TInput, TResult>
): Promise<MutationResult<TResult>> {
  const {
    context,
    action,
    entityType,
    mutationFn,
    getAuditInfo,
    activityType,
    invalidateKeys = [],
    successMessage,
    queryClient,
  } = options;

  try {
    // 1. Permission check
    await assertPermission(
      context.userId,
      action,
      entityType,
      context.scopeType,
      context.scopeId
    );

    // 2. Execute mutation
    const result = await mutationFn(input);

    // 3. Audit log
    const auditInfo = getAuditInfo(input, result);
    await logTestActivity(context, {
      activityType,
      entityType,
      ...auditInfo,
    });

    // 4. Invalidate queries
    if (queryClient && invalidateKeys.length > 0) {
      await Promise.all(
        invalidateKeys.map(key => 
          queryClient.invalidateQueries({ queryKey: key })
        )
      );
    }

    // 5. Success toast
    if (successMessage) {
      toast.success(successMessage);
    }

    return { data: result, success: true };
  } catch (err) {
    const mapped = standardErrorMapper(err);
    toast.error(mapped.message);
    throw mapped;
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER HOOKS / UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a pipeline context from current user and scope
 */
export function createPipelineContext(
  userId: string,
  scopeType: 'program' | 'project' | 'global',
  scopeId: string | null,
  programId?: string | null,
  projectId?: string | null
): PipelineContext {
  return {
    userId,
    scopeType: scopeType as ScopeType,
    scopeId,
    programId: scopeType === 'program' ? scopeId : programId,
    projectId: scopeType === 'project' ? scopeId : projectId,
  };
}

/**
 * Validate that required fields are present
 */
export function validateRequired<T>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  for (const field of requiredFields) {
    const value = (data as Record<string, unknown>)[field as string];
    if (value === undefined || value === null || value === '') {
      throw new PipelineError(
        'validation_error',
        `${String(field).replace(/_/g, ' ')} is required`
      );
    }
  }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string | undefined | null,
  fieldName: string,
  minLength: number,
  maxLength: number
): void {
  if (!value) return;
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new PipelineError(
      'validation_error',
      `${fieldName} must be at least ${minLength} characters`
    );
  }
  if (trimmed.length > maxLength) {
    throw new PipelineError(
      'validation_error',
      `${fieldName} must be less than ${maxLength} characters`
    );
  }
}
