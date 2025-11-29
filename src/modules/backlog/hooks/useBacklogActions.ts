import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBacklogActions(itemType: string = 'epic') {
  const queryClient = useQueryClient();
  const tableName = getTableName(itemType);

  // Fetch available PIs for context menu
  const { data: availablePIs = [] } = useQuery({
    queryKey: ['program-increments-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name')
        .order('start_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // Duplicate item
  const duplicateMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data: original, error: fetchError } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      const { id, created_at, updated_at, ...itemData } = original as any;
      const duplicate = {
        ...itemData,
        name: `${itemData.name} (Copy)`,
        global_rank: null,
      };

      const { data, error } = await supabase
        .from(tableName as any)
        .insert(duplicate as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Item duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to duplicate: ${error.message}`);
    },
  });

  // Move to top
  const moveToTopMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data: items } = await supabase
        .from(tableName as any)
        .select('id, global_rank')
        .order('global_rank', { ascending: true, nullsFirst: false });

      const minRank = (items as any)?.[0]?.global_rank || 1;
      
      await supabase
        .from(tableName as any)
        .update({ global_rank: minRank - 1 } as any)
        .eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Moved to top');
    },
    onError: (error: any) => {
      toast.error(`Failed to move: ${error.message}`);
    },
  });

  // Move to bottom
  const moveToBottomMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data: items } = await supabase
        .from(tableName as any)
        .select('id, global_rank')
        .order('global_rank', { ascending: false, nullsFirst: false });

      const maxRank = (items as any)?.[0]?.global_rank || 0;
      
      await supabase
        .from(tableName as any)
        .update({ global_rank: maxRank + 1 } as any)
        .eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Moved to bottom');
    },
    onError: (error: any) => {
      toast.error(`Failed to move: ${error.message}`);
    },
  });

  // Move to PI
  const moveToPIMutation = useMutation({
    mutationFn: async ({ itemId, piId }: { itemId: string; piId: string }) => {
      if (itemType === 'epic') {
        // Remove existing PI assignments
        await supabase
          .from('epic_program_increments' as any)
          .delete()
          .eq('epic_id', itemId);

        // Add new PI assignment
        await supabase
          .from('epic_program_increments' as any)
          .insert({
            epic_id: itemId,
            pi_id: piId,
          } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Moved to Program Increment');
    },
    onError: (error: any) => {
      toast.error(`Failed to move: ${error.message}`);
    },
  });

  // Park item (soft archive)
  const parkMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase
        .from(tableName as any)
        .update({ parked_at: new Date().toISOString() } as any)
        .eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Moved to parking lot');
    },
    onError: (error: any) => {
      toast.error(`Failed to park: ${error.message}`);
    },
  });

  // Delete item (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase
        .from(tableName as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Item deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  return {
    availablePIs,
    duplicate: (itemId: string) => duplicateMutation.mutate(itemId),
    moveToTop: (itemId: string) => moveToTopMutation.mutate(itemId),
    moveToBottom: (itemId: string) => moveToBottomMutation.mutate(itemId),
    moveToPI: (itemId: string, piId: string) => moveToPIMutation.mutate({ itemId, piId }),
    park: (itemId: string) => parkMutation.mutate(itemId),
    deleteItem: (itemId: string) => deleteMutation.mutate(itemId),
  };
}

function getTableName(type: string): string {
  const tableMap: Record<string, string> = {
    theme: 'strategic_themes',
    epic: 'epics',
    capability: 'capabilities',
    feature: 'features',
    story: 'stories',
    defect: 'defects',
    objective: 'objectives',
  };
  return tableMap[type] || 'epics';
}
