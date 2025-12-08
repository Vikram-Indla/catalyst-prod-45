import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KeyHistoryEntry {
  id: string;
  work_item_id: string;
  work_item_type: string;
  old_key: string;
  new_key: string;
  changed_at: string;
  changed_by: string | null;
  reason: string | null;
}

export function useWorkItemKeyHistory(workItemId: string, workItemType: string) {
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['work-item-key-history', workItemId, workItemType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_key_history')
        .select('*')
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as KeyHistoryEntry[];
    },
    enabled: !!workItemId && !!workItemType,
  });

  const recordKeyChange = useMutation({
    mutationFn: async ({ oldKey, newKey, reason }: { oldKey: string; newKey: string; reason?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('work_item_key_history')
        .insert({
          work_item_id: workItemId,
          work_item_type: workItemType,
          old_key: oldKey,
          new_key: newKey,
          changed_by: user?.user?.id,
          reason,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-key-history', workItemId, workItemType] });
    },
  });

  return {
    history,
    isLoading,
    recordKeyChange,
  };
}

// Function to find work item by historical key
export async function findByHistoricalKey(key: string): Promise<{
  workItemId: string;
  workItemType: string;
  currentKey: string | null;
} | null> {
  const { data: historyEntry } = await supabase
    .from('work_item_key_history')
    .select('work_item_id, work_item_type')
    .ilike('old_key', key)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!historyEntry) return null;

  return {
    workItemId: historyEntry.work_item_id,
    workItemType: historyEntry.work_item_type,
    currentKey: null, // Will be resolved by the caller
  };
}
