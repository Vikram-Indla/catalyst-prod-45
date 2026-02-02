/**
 * Task¹⁰ Labels Hook - Fetch and manage labels for a list
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AqdLabel } from '../types/aqd.types';

export function useAqdLabels(listId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ['aqd-labels', listId],
    queryFn: async (): Promise<AqdLabel[]> => {
      if (!listId) return [];
      const { data, error } = await supabase
        .from('aqd_labels')
        .select('*')
        .eq('list_id', listId)
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []) as AqdLabel[];
    },
    enabled: !!listId,
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!listId) throw new Error('Missing list ID');
      const nextOrder = labels.length > 0 ? Math.max(...labels.map(l => l.sort_order)) + 1 : 0;
      const { data, error } = await supabase
        .from('aqd_labels')
        .insert({ list_id: listId, name, color, sort_order: nextOrder })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-labels', listId] });
      toast.success('Label created');
    },
    onError: (e) => toast.error(`Failed to create label: ${e.message}`),
  });

  const deleteLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase.from('aqd_labels').delete().eq('id', labelId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-labels', listId] });
      toast.success('Label deleted');
    },
    onError: (e) => toast.error(`Failed to delete label: ${e.message}`),
  });

  return {
    labels,
    isLoading,
    createLabel,
    deleteLabel,
  };
}

export default useAqdLabels;
