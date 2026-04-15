/**
 * useKanbanRealtime — Realtime subscription for kanban board issues
 * Subscribes to ph_issues changes and invalidates the board query.
 * Self-notification suppression: skips invalidation for changes made by the current user.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useKanbanRealtime(projectKey: string | undefined, currentUserId: string | null) {
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!projectKey) return;

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`kanban-rt-${projectKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ph_issues' },
        (payload) => {
          const updated = payload.new as Record<string, unknown> | undefined;

          // Self-notification suppression
          if (currentUserId && updated?.updated_by === currentUserId) {
            return;
          }

          // Filter to only this project's issues
          if (updated?.project_key !== projectKey.toUpperCase()) {
            return;
          }

          qc.invalidateQueries({ queryKey: ['kanban-issues', projectKey] });
        }
      )
      .subscribe();

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [projectKey, qc, currentUserId]);
}
