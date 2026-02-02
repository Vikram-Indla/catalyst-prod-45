/**
 * Task¹⁰ Item Detail Hook - Full CRUD for item fields
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AqdItemFull, AqdItemStatus } from '../types/aqd.types';

type ActivityAction = 
  | 'created'
  | 'status_changed'
  | 'description_updated'
  | 'assigned'
  | 'due_date_set'
  | 'due_date_removed'
  | 'label_added'
  | 'label_removed'
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'rank_changed'
  | 'carried_over';

async function logActivity(
  itemId: string,
  action: ActivityAction,
  fieldName?: string,
  oldValue?: string | null,
  newValue?: string | null,
  metadata?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase.from('aqd_activity').insert({
    item_id: itemId,
    action,
    field_name: fieldName ?? null,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    metadata: metadata as any ?? null,
    created_by: user?.id ?? null,
  } as any);
}

function getActionForField(field: string): ActivityAction {
  switch (field) {
    case 'status': return 'status_changed';
    case 'description': return 'description_updated';
    case 'assignee_id': return 'assigned';
    case 'due_date': return 'due_date_set';
    default: return 'status_changed';
  }
}

export function useAqdItemDetail(itemId: string | null, weekId?: string) {
  const queryClient = useQueryClient();

  // Fetch item details from the full view
  const { data: item, isLoading } = useQuery({
    queryKey: ['aqd-item-detail', itemId],
    queryFn: async (): Promise<AqdItemFull | null> => {
      if (!itemId) return null;
      
      const { data, error } = await supabase
        .from('aqd_items_full')
        .select('*')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      return data as unknown as AqdItemFull;
    },
    enabled: !!itemId,
  });

  // Update item field mutation
  const updateItem = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: unknown }) => {
      if (!itemId) throw new Error('No item ID');
      
      // Get old value for activity log
      const { data: oldItem } = await supabase
        .from('aqd_items')
        .select(field)
        .eq('id', itemId)
        .single();

      const { error } = await supabase
        .from('aqd_items')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;

      // Log activity
      const oldValue = oldItem?.[field as keyof typeof oldItem];
      await logActivity(
        itemId, 
        getActionForField(field), 
        field, 
        oldValue?.toString() ?? null, 
        value?.toString() ?? null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-item-detail', itemId] });
      if (weekId) {
        queryClient.invalidateQueries({ queryKey: ['aqd-items', weekId] });
      }
    },
  });

  return {
    item,
    isLoading,
    updateStatus: (status: AqdItemStatus) => updateItem.mutate({ field: 'status', value: status }),
    updateDescription: (description: string) => updateItem.mutate({ field: 'description', value: description || null }),
    updateAssignee: (assigneeId: string | null) => updateItem.mutate({ field: 'assignee_id', value: assigneeId }),
    updateDueDate: (dueDate: string | null) => updateItem.mutate({ field: 'due_date', value: dueDate }),
    updateTitle: (title: string) => updateItem.mutate({ field: 'title', value: title }),
    isUpdating: updateItem.isPending,
    logActivity,
  };
}

export { logActivity };
export type { ActivityAction };
