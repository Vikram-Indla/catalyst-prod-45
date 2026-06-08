/**
 * useChatMentions — list of chat @mention notifications for the current user.
 * Reads notifications WHERE notification_type='chat_mention' AND
 * recipient_user_id=auth.uid(). RLS handles the recipient filter.
 *
 * Source of truth — the chat_fanout_mentions trigger writes one
 * notifications row per matched @Name token (Phase 2 migration).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMentionRow {
  id: string;
  entityId: string;             // chat_messages.id
  entityKey: string;            // ticket_key OR project_key (anchor)
  entityTitle: string;          // body preview
  actorUserId: string | null;
  createdAt: string;
  readAt: string | null;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useChatMentions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['chat', 'mentions', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ChatMentionRow[]> => {
      const { data, error } = await db
        .from('notifications')
        .select('id, entity_id, entity_key, entity_title, actor_user_id, created_at, read_at')
        .eq('notification_type', 'chat_mention')
        .eq('recipient_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error || !data) return [];
      return (data as Array<any>).map((r) => ({
        id: r.id,
        entityId: r.entity_id,
        entityKey: r.entity_key ?? '',
        entityTitle: r.entity_title ?? '',
        actorUserId: r.actor_user_id,
        createdAt: r.created_at,
        readAt: r.read_at,
      }));
    },
  });
}

export function useMarkMentionRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await db
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'mentions'] }),
  });
}
