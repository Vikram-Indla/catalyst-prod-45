// Centralized audit logging utility for work items
// Logs create/update/delete actions to activity_logs table

import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 'created' | 'updated' | 'deleted' | 'status_changed';

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
}

/**
 * Log an action to the activity_logs table
 * Works silently - errors are logged to console but don't throw
 */
export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        actor_id: user?.id || null,
        before_json: entry.beforeData || null,
        after_json: entry.afterData || null,
      });

    if (error) {
      console.error('Failed to log audit entry:', error);
    }
  } catch (err) {
    console.error('Error in audit logging:', err);
  }
}

/**
 * Compare two objects and return changed fields
 */
export function getChangedFields(
  before: Record<string, any> | null,
  after: Record<string, any> | null
): { field: string; from: any; to: any }[] {
  if (!before || !after) return [];
  
  const changes: { field: string; from: any; to: any }[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    // Skip metadata fields
    if (['created_at', 'updated_at', 'id'].includes(key)) continue;
    
    const beforeVal = before[key];
    const afterVal = after[key];
    
    // Deep compare for objects/arrays
    const beforeStr = JSON.stringify(beforeVal);
    const afterStr = JSON.stringify(afterVal);
    
    if (beforeStr !== afterStr) {
      changes.push({ field: key, from: beforeVal, to: afterVal });
    }
  }
  
  return changes;
}
