/**
 * Phase 5C: Data Access Audit Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DataAccessAudit } from '../types/test-data-management';

interface AuditFilters {
  dataSetId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function useAccessAudit(filters: AuditFilters = {}) {
  const queryClient = useQueryClient();

  const queryKey = ['data-access-audit', filters];

  const { data: auditLogs = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('data_access_audit')
        .select(`
          *,
          test_data_sets(name),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters.dataSetId) {
        query = query.eq('data_set_id', filters.dataSetId);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((log: Record<string, unknown>) => ({
        ...log,
        data_set_name: (log.test_data_sets as { name?: string } | null)?.name,
        user_name: (log.profiles as { full_name?: string } | null)?.full_name,
      })) as DataAccessAudit[];
    },
  });

  const logAccessMutation = useMutation({
    mutationFn: async (params: {
      dataSetId: string;
      action: 'view' | 'export' | 'modify' | 'delete';
      details?: Record<string, unknown>;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('data_access_audit')
        .insert([{
          data_set_id: params.dataSetId,
          user_id: user?.user?.id || null,
          action: params.action,
          details: params.details ? JSON.parse(JSON.stringify(params.details)) : null,
          user_agent: navigator.userAgent,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-access-audit'] });
    },
  });

  // Summary statistics
  const stats = {
    totalLogs: auditLogs.length,
    viewCount: auditLogs.filter(l => l.action === 'view').length,
    exportCount: auditLogs.filter(l => l.action === 'export').length,
    modifyCount: auditLogs.filter(l => l.action === 'modify').length,
    deleteCount: auditLogs.filter(l => l.action === 'delete').length,
  };

  return {
    auditLogs,
    isLoading,
    error,
    logAccess: logAccessMutation.mutateAsync,
    stats,
    isLogging: logAccessMutation.isPending,
  };
}
