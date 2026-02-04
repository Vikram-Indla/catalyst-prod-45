// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useT10Realtime
// Purpose: Real-time subscriptions for Task¹⁰ items to sync changes across views
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { t10ItemKeys } from './useT10Items';
import { t10WeekKeys } from './useT10Weeks';

/**
 * Subscribe to real-time changes for a specific item
 * Invalidates queries when the item is updated
 */
export function useT10ItemRealtime(itemId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!itemId) return;

    const channel = supabase
      .channel(`t10-item-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 't10_items',
          filter: `id=eq.${itemId}`,
        },
        (payload) => {
          console.log('[T10 Realtime] Item changed:', payload.eventType, itemId);
          
          // Invalidate the specific item query
          queryClient.invalidateQueries({ queryKey: t10ItemKeys.item(itemId) });
          
          // Also invalidate week queries if we have week_id
          if (payload.new && typeof payload.new === 'object' && 'week_id' in payload.new) {
            const weekId = (payload.new as { week_id: string }).week_id;
            queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(weekId) });
            queryClient.invalidateQueries({ queryKey: t10ItemKeys.buffer(weekId) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, queryClient]);
}

/**
 * Subscribe to real-time changes for all items in a week
 * Invalidates queries when any item in the week changes
 */
export function useT10WeekItemsRealtime(weekId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!weekId) return;

    const channel = supabase
      .channel(`t10-week-items-${weekId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 't10_items',
          filter: `week_id=eq.${weekId}`,
        },
        (payload) => {
          console.log('[T10 Realtime] Week items changed:', payload.eventType);
          
          // Invalidate all item queries for this week
          queryClient.invalidateQueries({ queryKey: t10ItemKeys.byWeek(weekId) });
          queryClient.invalidateQueries({ queryKey: t10ItemKeys.buffer(weekId) });
          
          // If we have the item id, also invalidate individual item query
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const itemId = (payload.new as { id: string }).id;
            queryClient.invalidateQueries({ queryKey: t10ItemKeys.item(itemId) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weekId, queryClient]);
}

/**
 * Subscribe to real-time changes for item labels junction table
 */
export function useT10ItemLabelsRealtime(itemId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!itemId) return;

    const channel = supabase
      .channel(`t10-item-labels-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 't10_item_labels',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          console.log('[T10 Realtime] Item labels changed:', payload.eventType);
          
          // Invalidate item query to refresh labels
          queryClient.invalidateQueries({ queryKey: t10ItemKeys.item(itemId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, queryClient]);
}

/**
 * Combined hook for full item realtime (item + labels)
 */
export function useT10FullItemRealtime(itemId: string | null) {
  useT10ItemRealtime(itemId);
  useT10ItemLabelsRealtime(itemId);
}
