/**
 * usePinsBookmarks — channel-scoped pins (shared) + per-user bookmarks
 * ("save for later"). Pins are visible to all members; bookmarks are
 * personal and never surfaced to others (RLS-gated).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (table: string) => any };

export function useConversationPins(conversationId: string | null) {
  return useQuery({
    queryKey: ['chat', 'pins', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data } = await db
        .from('chat_pinned_messages')
        .select('id, message_id, pinned_by, pinned_at')
        .eq('conversation_id', conversationId)
        .order('pinned_at', { ascending: false });
      return (data ?? []) as Array<{
        id: string; message_id: string; pinned_by: string | null; pinned_at: string;
      }>;
    },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, messageId, currentlyPinned }: {
      conversationId: string; messageId: string; currentlyPinned: boolean;
    }) => {
      if (currentlyPinned) {
        const { error } = await db
          .from('chat_pinned_messages')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('message_id', messageId);
        if (error) throw error;
      } else {
        const { error } = await db
          .from('chat_pinned_messages')
          .insert({ conversation_id: conversationId, message_id: messageId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['chat', 'pins', vars.conversationId] });
    },
  });
}

export function useMyBookmarks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['chat', 'bookmarks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db
        .from('chat_bookmarks')
        .select('id, message_id, conversation_id, note, created_at')
        .order('created_at', { ascending: false });
      return (data ?? []) as Array<{
        id: string; message_id: string; conversation_id: string;
        note: string | null; created_at: string;
      }>;
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, messageId, currentlyBookmarked }: {
      conversationId: string; messageId: string; currentlyBookmarked: boolean;
    }) => {
      if (currentlyBookmarked) {
        const { error } = await db
          .from('chat_bookmarks')
          .delete()
          .eq('message_id', messageId);
        if (error) throw error;
      } else {
        const { error } = await db
          .from('chat_bookmarks')
          .insert({ conversation_id: conversationId, message_id: messageId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'bookmarks'] });
      qc.invalidateQueries({ queryKey: ['chat-v2', 'later'] });
    },
  });
}
