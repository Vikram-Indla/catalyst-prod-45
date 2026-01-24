/**
 * Test Case Audit Log Hook
 * Fetches change history from tm_audit_log for a test case
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'execute' | 'clone';
  actor_id: string | null;
  actor_name: string;
  actor_avatar: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  created_at: string;
}

/**
 * Fetch audit log entries for a specific test case
 */
export function useTestCaseAuditLog(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-audit-log', testCaseId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      if (!testCaseId) return [];

      const { data, error } = await (supabase as any)
        .from('tm_audit_log')
        .select(`
          id,
          action,
          actor_id,
          changes,
          created_at,
          actor:profiles!tm_audit_log_actor_id_fkey(id, full_name, avatar_url)
        `)
        .eq('entity_type', 'test_case')
        .eq('entity_id', testCaseId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching audit log:', error);
        // Fallback without join
        const { data: fallbackData, error: fallbackError } = await (supabase as any)
          .from('tm_audit_log')
          .select('*')
          .eq('entity_type', 'test_case')
          .eq('entity_id', testCaseId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (fallbackError) throw fallbackError;

        return (fallbackData || []).map((entry: any) => ({
          id: entry.id,
          action: entry.action,
          actor_id: entry.actor_id,
          actor_name: 'Unknown User',
          actor_avatar: null,
          changes: entry.changes,
          created_at: entry.created_at,
        }));
      }

      return (data || []).map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        actor_id: entry.actor_id,
        actor_name: entry.actor?.full_name || 'Unknown User',
        actor_avatar: entry.actor?.avatar_url || null,
        changes: entry.changes,
        created_at: entry.created_at,
      }));
    },
    enabled: !!testCaseId,
  });
}

/**
 * Get audit log count for a test case
 */
export function useTestCaseAuditLogCount(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-audit-log-count', testCaseId],
    queryFn: async (): Promise<number> => {
      if (!testCaseId) return 0;

      const { count, error } = await (supabase as any)
        .from('tm_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'test_case')
        .eq('entity_id', testCaseId);

      if (error) {
        console.error('Error counting audit log:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!testCaseId,
  });
}
