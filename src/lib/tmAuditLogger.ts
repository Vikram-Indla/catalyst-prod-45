/**
 * Centralized audit logging utility for Test Management module
 * Logs create/update/delete actions to tm_audit_log table
 */

import { supabase, typedQuery } from '@/integrations/supabase/client';

export type TMAuditAction = 'create' | 'update' | 'delete' | 'assign' | 'execute' | 'clone';
export type TMAuditEntityType = 'test_case' | 'test_cycle' | 'test_run' | 'test_step' | 'defect' | 'scope' | 'folder';

export interface TMAuditLogEntry {
  projectId: string;
  entityType: TMAuditEntityType;
  entityId: string;
  action: TMAuditAction;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
}

/**
 * Log an action to the tm_audit_log table
 * Works silently - errors are logged to console but don't throw
 */
export async function logTMAuditEntry(entry: TMAuditLogEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await typedQuery('tm_audit_log')
      .insert({
        project_id: entry.projectId,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        actor_id: user?.id || null,
        changes: entry.changes || null,
      });

    if (error) {
      console.error('Failed to log TM audit entry:', error);
    }
  } catch (err) {
    console.error('Error in TM audit logging:', err);
  }
}

/**
 * Compare two objects and return changed fields in audit format
 */
export function getAuditChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Record<string, { old: unknown; new: unknown }> | null {
  if (!before || !after) return null;
  
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    // Skip metadata fields
    if (['created_at', 'updated_at', 'id', 'version'].includes(key)) continue;
    
    const oldVal = before[key];
    const newVal = after[key];
    
    // Deep compare for objects/arrays
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);
    
    if (oldStr !== newStr) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Create audit entry for test case creation
 */
export async function auditTestCaseCreate(projectId: string, testCaseId: string, data: Record<string, unknown>): Promise<void> {
  await logTMAuditEntry({
    projectId,
    entityType: 'test_case',
    entityId: testCaseId,
    action: 'create',
    changes: { created: { old: null, new: data } },
  });
}

/**
 * Create audit entry for test case update
 */
export async function auditTestCaseUpdate(
  projectId: string, 
  testCaseId: string, 
  before: Record<string, unknown>, 
  after: Record<string, unknown>
): Promise<void> {
  const changes = getAuditChanges(before, after);
  if (changes) {
    await logTMAuditEntry({
      projectId,
      entityType: 'test_case',
      entityId: testCaseId,
      action: 'update',
      changes,
    });
  }
}

/**
 * Create audit entry for test case deletion
 */
export async function auditTestCaseDelete(projectId: string, testCaseId: string): Promise<void> {
  await logTMAuditEntry({
    projectId,
    entityType: 'test_case',
    entityId: testCaseId,
    action: 'delete',
  });
}

/**
 * Create audit entry for test cycle creation
 */
export async function auditCycleCreate(projectId: string, cycleId: string, data: Record<string, unknown>): Promise<void> {
  await logTMAuditEntry({
    projectId,
    entityType: 'test_cycle',
    entityId: cycleId,
    action: 'create',
    changes: { created: { old: null, new: data } },
  });
}

/**
 * Create audit entry for test cycle update
 */
export async function auditCycleUpdate(
  projectId: string, 
  cycleId: string, 
  before: Record<string, unknown>, 
  after: Record<string, unknown>
): Promise<void> {
  const changes = getAuditChanges(before, after);
  if (changes) {
    await logTMAuditEntry({
      projectId,
      entityType: 'test_cycle',
      entityId: cycleId,
      action: 'update',
      changes,
    });
  }
}

/**
 * Create audit entry for test cycle deletion
 */
export async function auditCycleDelete(projectId: string, cycleId: string): Promise<void> {
  await logTMAuditEntry({
    projectId,
    entityType: 'test_cycle',
    entityId: cycleId,
    action: 'delete',
  });
}

/**
 * Create audit entry for execution status change
 */
export async function auditExecutionStatusChange(
  projectId: string, 
  scopeId: string, 
  oldStatus: string, 
  newStatus: string
): Promise<void> {
  await logTMAuditEntry({
    projectId,
    entityType: 'scope',
    entityId: scopeId,
    action: 'execute',
    changes: { current_status: { old: oldStatus, new: newStatus } },
  });
}
