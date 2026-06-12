/**
 * useCreateConversation — creates chat conversations (DMs and channels).
 *
 * A DB trigger auto-adds the conversation creator as a member on insert. For a
 * 'dm' both participants must be members, so createDM explicitly upserts both
 * rows (ON CONFLICT DO NOTHING) after the insert. createChannel relies on the
 * trigger's roster.
 *
 * On success the caller's conversations query (['chat','conversations',userId])
 * is invalidated so useConversations refetches the new row.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// chat_* tables are created in parallel and are not in the generated Database
// types yet — cast to bypass typed-table inference (mirrors useConversations).
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export function useCreateConversation(): {
  createDM: (otherUserId: string) => Promise<string>;
  createChannel: (projectKey: string, title: string) => Promise<string>;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', userId] });
  }, [queryClient, userId]);

  const createDM = useCallback(
    async (otherUserId: string): Promise<string> => {
      if (!userId) throw new Error('Not authenticated');

      // Atomic create-or-return via SECURITY DEFINER RPC: dedups by member pair
      // and adds BOTH members regardless of the creator's role (a client-side
      // insert can't add the other user under member-gated RLS).
      const { data, error } = await db.rpc('chat_create_dm', {
        other_user_id: otherUserId,
      });
      if (error || !data) {
        throw error ?? new Error('Failed to create DM');
      }

      invalidate();
      return data as string;
    },
    [userId, invalidate],
  );

  const createChannel = useCallback(
    async (projectKey: string, title: string): Promise<string> => {
      if (!userId) throw new Error('Not authenticated');

      const { data: created, error } = await db
        .from('chat_conversations')
        .insert({ kind: 'channel', project_key: projectKey, title })
        .select('id')
        .single();
      if (error || !created?.id) {
        throw error ?? new Error('Failed to create channel');
      }

      invalidate();
      return created.id as string;
    },
    [userId, invalidate],
  );

  return { createDM, createChannel };
}

export default useCreateConversation;
