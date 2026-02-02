/**
 * Task¹⁰ Item Labels Hook - Add/remove labels from items
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from './useAqdItemDetail';

export function useAqdItemLabels(itemId: string, weekId?: string) {
  const queryClient = useQueryClient();

  // Add label to item
  const addLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('aqd_item_labels')
        .insert({ item_id: itemId, label_id: labelId });
      
      if (error) throw error;

      // Get label name for activity log
      const { data: label } = await supabase
        .from('aqd_labels')
        .select('name')
        .eq('id', labelId)
        .single();
      
      await logActivity(itemId, 'label_added', 'label', null, label?.name ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-item-detail', itemId] });
      if (weekId) {
        queryClient.invalidateQueries({ queryKey: ['aqd-items', weekId] });
      }
    },
  });

  // Remove label from item
  const removeLabel = useMutation({
    mutationFn: async (labelId: string) => {
      // Get label name for activity log
      const { data: label } = await supabase
        .from('aqd_labels')
        .select('name')
        .eq('id', labelId)
        .single();

      const { error } = await supabase
        .from('aqd_item_labels')
        .delete()
        .eq('item_id', itemId)
        .eq('label_id', labelId);
      
      if (error) throw error;

      await logActivity(itemId, 'label_removed', 'label', label?.name ?? null, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-item-detail', itemId] });
      if (weekId) {
        queryClient.invalidateQueries({ queryKey: ['aqd-items', weekId] });
      }
    },
  });

  return {
    addLabel: addLabel.mutate,
    removeLabel: removeLabel.mutate,
    isAdding: addLabel.isPending,
    isRemoving: removeLabel.isPending,
  };
}
