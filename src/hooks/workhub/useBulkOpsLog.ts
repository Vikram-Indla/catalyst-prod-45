/**
 * Bulk Ops Log Hooks — Phase 9
 * Read/write audit trail for bulk operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BulkOpsLogEntry {
  id: string;
  operation: string;
  affected_item_ids: string[];
  field_changed?: string;
  old_values?: Record<string, any>;
  new_values: Record<string, any>;
  item_count?: number;
  performed_by?: string;
  performed_at: string;
}

export function useBulkOpsLog() {
  return useQuery({
    queryKey: ['workhub', 'bulk-ops-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_bulk_ops_log')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as BulkOpsLogEntry[];
    },
    staleTime: 30_000,
  });
}

export function useLogBulkOp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      operation: string;
      affected_item_ids: string[];
      field_changed?: string;
      old_values?: Record<string, any>;
      new_values: Record<string, any>;
      item_count?: number;
    }) => {
      const { error } = await supabase
        .from('ph_bulk_ops_log')
        .insert({
          operation: params.operation,
          affected_item_ids: params.affected_item_ids,
          field_changed: params.field_changed,
          old_values: params.old_values,
          new_values: params.new_values,
          item_count: params.item_count || params.affected_item_ids.length,
        } as any);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'bulk-ops-log'] });
    },
  });
}
