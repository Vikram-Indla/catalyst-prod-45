/**
 * useWebLinks — data layer for the Web Links section.
 *
 * Reads + mutates `ph_web_links` keyed on a work item UUID. Mirrors
 * BrActivitySection's data pattern: list query with 4s polling +
 * Supabase Realtime subscription, plus add/delete mutations that
 * invalidate the list on success.
 */
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { catalystToast } from '@/lib/catalystToast';

export interface WebLinkRow {
  id: string;
  work_item_id: string;
  url: string;
  link_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseWebLinksResult {
  links: WebLinkRow[];
  isLoading: boolean;
  addLink: (input: { url: string; link_text: string | null }) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  isAdding: boolean;
}

export function useWebLinks(workItemId: string | null | undefined): UseWebLinksResult {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const enabled = !!workItemId;
  const queryKey = ['ph-web-links', workItemId];

  const { data: links = [], isLoading } = useQuery<WebLinkRow[]>({
    queryKey,
    enabled,
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_web_links')
        .select('id, work_item_id, url, link_text, created_by, created_at, updated_at')
        .eq('work_item_id', workItemId!)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[useWebLinks] select failed', error);
        return [];
      }
      return (data ?? []) as WebLinkRow[];
    },
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`ph-web-links:${workItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_web_links',
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
    mutationFn: async ({ url, link_text }: { url: string; link_text: string | null }) => {
      if (!workItemId) throw new Error('Work item not resolved');
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('ph_web_links')
        .insert({
          work_item_id: workItemId,
          url,
          link_text: link_text && link_text.trim().length > 0 ? link_text.trim() : null,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystToast.success('Web link added');
    },
    onError: () => catalystToast.error('Failed to add web link'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('ph_web_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystToast.success('Web link removed');
    },
    onError: () => catalystToast.error('Failed to remove web link'),
  });

  return {
    links,
    isLoading,
    addLink: (input) => addMutation.mutateAsync(input),
    deleteLink: (id) => deleteMutation.mutateAsync(id),
    isAdding: addMutation.isPending,
  };
}
