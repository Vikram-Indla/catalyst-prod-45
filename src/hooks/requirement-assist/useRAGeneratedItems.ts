import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  RAGeneratedItem, 
  CreateRAGeneratedItem, 
  UpdateRAGeneratedItem,
  ItemType 
} from '@/types/requirement-assist';

// Fetch items for a generation
export function useRAGeneratedItems(generationId: string | undefined) {
  return useQuery({
    queryKey: ['ra-generated-items', generationId],
    queryFn: async () => {
      if (!generationId) return [];
      const { data, error } = await supabase
        .from('ra_generated_items')
        .select('*')
        .eq('generation_id', generationId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as RAGeneratedItem[];
    },
    enabled: !!generationId,
  });
}

// Fetch single item
export function useRAGeneratedItem(id: string | undefined) {
  return useQuery({
    queryKey: ['ra-generated-item', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('ra_generated_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as RAGeneratedItem | null;
    },
    enabled: !!id,
  });
}

// Get item counts by type for a generation
export function useRAItemCounts(generationId: string | undefined) {
  return useQuery({
    queryKey: ['ra-item-counts', generationId],
    queryFn: async () => {
      if (!generationId) {
        return { prd: 0, epic: 0, feature: 0, story: 0 };
      }
      
      const { data, error } = await supabase
        .from('ra_generated_items')
        .select('item_type')
        .eq('generation_id', generationId);
      
      if (error) throw error;

      const counts = {
        prd: data.filter(i => i.item_type === 'prd').length,
        epic: data.filter(i => i.item_type === 'epic').length,
        feature: data.filter(i => i.item_type === 'feature').length,
        story: data.filter(i => i.item_type === 'story').length,
      };
      return counts;
    },
    enabled: !!generationId,
  });
}

// Create item
export function useCreateRAGeneratedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: CreateRAGeneratedItem) => {
      const { data, error } = await supabase
        .from('ra_generated_items')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data as RAGeneratedItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ra-generated-items', data.generation_id] });
      queryClient.invalidateQueries({ queryKey: ['ra-item-counts', data.generation_id] });
    },
    onError: (error) => {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    },
  });
}

// Bulk create items
export function useBulkCreateRAGeneratedItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: CreateRAGeneratedItem[]) => {
      const { data, error } = await supabase
        .from('ra_generated_items')
        .insert(items)
        .select();
      if (error) throw error;
      return data as RAGeneratedItem[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['ra-generated-items', data[0].generation_id] });
        queryClient.invalidateQueries({ queryKey: ['ra-item-counts', data[0].generation_id] });
      }
    },
    onError: (error) => {
      console.error('Error creating items:', error);
      toast.error('Failed to create items');
    },
  });
}

// Update item
export function useUpdateRAGeneratedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRAGeneratedItem & { id: string }) => {
      const { data, error } = await supabase
        .from('ra_generated_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RAGeneratedItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ra-generated-items', data.generation_id] });
      queryClient.invalidateQueries({ queryKey: ['ra-generated-item', data.id] });
    },
    onError: (error) => {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    },
  });
}

// Delete item
export function useDeleteRAGeneratedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, generationId }: { id: string; generationId: string }) => {
      const { error } = await supabase
        .from('ra_generated_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, generationId };
    },
    onSuccess: ({ generationId }) => {
      queryClient.invalidateQueries({ queryKey: ['ra-generated-items', generationId] });
      queryClient.invalidateQueries({ queryKey: ['ra-item-counts', generationId] });
      toast.success('Item deleted');
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    },
  });
}
