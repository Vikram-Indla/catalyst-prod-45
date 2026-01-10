import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Hook to subscribe to real-time updates for RA generations
export function useRAGenerationsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('ra-generations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ra_generations',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[RA Realtime] Generation change:', payload.eventType);
          
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['ra-generations'] });
          queryClient.invalidateQueries({ queryKey: ['ra-generation-stats'] });
          
          // If specific generation was updated, invalidate its query too
          if (payload.new && 'id' in payload.new) {
            queryClient.invalidateQueries({ queryKey: ['ra-generation', payload.new.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// Hook to subscribe to real-time updates for RA generated items
export function useRAGeneratedItemsRealtime(generationId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!generationId) return;

    const channel = supabase
      .channel(`ra-items-${generationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ra_generated_items',
          filter: `generation_id=eq.${generationId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[RA Realtime] Item change:', payload.eventType);
          
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['ra-generated-items', generationId] });
          queryClient.invalidateQueries({ queryKey: ['ra-item-counts', generationId] });
          
          // If specific item was updated
          if (payload.new && 'id' in payload.new) {
            queryClient.invalidateQueries({ queryKey: ['ra-generated-item', payload.new.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, generationId]);
}

// Combined hook for convenience
export function useRARealtimeSubscriptions(generationId?: string | null) {
  useRAGenerationsRealtime();
  useRAGeneratedItemsRealtime(generationId);
}
