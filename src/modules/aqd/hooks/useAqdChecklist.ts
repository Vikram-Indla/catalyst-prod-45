/**
 * Task¹⁰ Checklist Hook - Full CRUD for item checklists with AI generation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface AqdChecklistItem {
  id: string;
  item_id: string;
  content: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export function useAqdChecklist(itemId: string) {
  const queryClient = useQueryClient();

  // Fetch checklist items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['aqd-checklist', itemId],
    queryFn: async (): Promise<AqdChecklistItem[]> => {
      const { data, error } = await supabase
        .from('aqd_checklists')
        .select('*')
        .eq('item_id', itemId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as AqdChecklistItem[];
    },
    enabled: !!itemId,
  });

  // Toggle item completion
  const toggleItem = useMutation({
    mutationFn: async ({ checklistId, isCompleted }: { checklistId: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from('aqd_checklists')
        .update({ is_completed: isCompleted })
        .eq('id', checklistId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-checklist', itemId] });
    },
  });

  // Add single item
  const addItem = useMutation({
    mutationFn: async ({ content, sortOrder }: { content: string; sortOrder: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('aqd_checklists')
        .insert({
          item_id: itemId,
          content,
          sort_order: sortOrder,
          created_by: userData.user?.id,
        } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-checklist', itemId] });
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (checklistId: string) => {
      const { error } = await supabase
        .from('aqd_checklists')
        .delete()
        .eq('id', checklistId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-checklist', itemId] });
    },
  });

  // Bulk insert (for AI generation)
  const bulkInsert = useMutation({
    mutationFn: async (newItems: { content: string; sort_order: number }[]) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData = newItems.map(item => ({
        item_id: itemId,
        content: item.content,
        sort_order: item.sort_order,
        is_completed: false,
        created_by: userData.user?.id,
      }));

      const { error } = await supabase
        .from('aqd_checklists')
        .insert(insertData as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-checklist', itemId] });
    },
  });

  // Clear all items (before AI regeneration)
  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('aqd_checklists')
        .delete()
        .eq('item_id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-checklist', itemId] });
    },
  });

  return {
    items,
    isLoading,
    toggleItem: toggleItem.mutate,
    addItem: addItem.mutate,
    deleteItem: deleteItem.mutate,
    bulkInsert: bulkInsert.mutateAsync,
    clearAll: clearAll.mutateAsync,
    isToggling: toggleItem.isPending,
    isAdding: addItem.isPending,
    isDeleting: deleteItem.isPending,
    isBulkInserting: bulkInsert.isPending,
  };
}

// Realtime hook for checklist updates
export function useAqdChecklistRealtime(itemId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`aqd-checklist-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aqd_checklists',
          filter: `item_id=eq.${itemId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['aqd-checklist', itemId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, queryClient]);
}

// Calculate progress percentage
export function calculateChecklistProgress(items: AqdChecklistItem[]): number {
  if (items.length === 0) return 0;
  const completed = items.filter(i => i.is_completed).length;
  return Math.round((completed / items.length) * 100);
}
