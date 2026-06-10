/**
 * useDesigns — data layer for the Designs section.
 *
 * Mirrors useWebLinks: list query + add/delete mutations + realtime
 * subscription. Only difference is the table (ph_designs) and the
 * absence of a link_text column.
 */
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { catalystToast } from '@/lib/catalystToast';

export interface DesignRow {
  id: string;
  work_item_id: string;
  url: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseDesignsResult {
  designs: DesignRow[];
  isLoading: boolean;
  addDesign: (url: string) => Promise<void>;
  deleteDesign: (id: string) => Promise<void>;
  isAdding: boolean;
}

export function useDesigns(workItemId: string | null | undefined): UseDesignsResult {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const enabled = !!workItemId;
  const queryKey = ['ph-designs', workItemId];

  const { data: designs = [], isLoading } = useQuery<DesignRow[]>({
    queryKey,
    enabled,
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_designs')
        .select('id, work_item_id, url, created_by, created_at, updated_at')
        .eq('work_item_id', workItemId!)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[useDesigns] select failed', error);
        return [];
      }
      return (data ?? []) as DesignRow[];
    },
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`ph-designs:${workItemId}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_designs',
          filter: `work_item_id=eq.${workItemId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, workItemId, queryClient]);

  const addMutation = useMutation({
    mutationFn: async (url: string) => {
      if (!workItemId) throw new Error('Work item not resolved');
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('ph_designs')
        .insert({ work_item_id: workItemId, url, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystToast.success('Design linked');
    },
    onError: () => catalystToast.error('Failed to link design'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('ph_designs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystToast.success('Design removed');
    },
    onError: () => catalystToast.error('Failed to remove design'),
  });

  return {
    designs,
    isLoading,
    addDesign: (url) => addMutation.mutateAsync(url),
    deleteDesign: (id) => deleteMutation.mutateAsync(id),
    isAdding: addMutation.isPending,
  };
}
