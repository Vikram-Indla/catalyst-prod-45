/**
 * useConversationDraft — per-conversation, server-side composer draft.
 *
 * - Reads chat_message_drafts on mount and seeds the composer.
 * - Debounced upsert on every setDraft call (600 ms).
 * - flush() bypasses debounce — called by the consumer on unmount so
 *   in-flight content is not lost when the user switches conversations.
 * - clearDraft() hard-deletes the row (called on send).
 *
 * Defensive — if the migration has not been applied, every read/write
 * is a no-op and the hook returns an empty draft.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  isDraftsTableAvailable,
  isMissingTableError,
  markDraftsTableMissing,
} from '../lib/chatDraftsFlags';

const db = supabase as unknown as { from: (t: string) => any };
const DEBOUNCE_MS = 600;

interface DraftRow {
  body_md: string;
  updated_at: string;
}

export function useConversationDraft(conversationId: string | null | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['chat-v2', 'draft', userId, conversationId] as const,
    [userId, conversationId],
  );

  const { data, isLoading } = useQuery<DraftRow | null>({
    queryKey,
    queryFn: async () => {
      if (!userId || !conversationId) return null;
      if (!isDraftsTableAvailable()) return null;
      const { data, error } = await db
        .from('chat_message_drafts')
        .select('body_md, updated_at')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      if (error) {
        if (isMissingTableError(error)) markDraftsTableMissing();
        return null;
      }
      return (data as DraftRow | null) ?? null;
    },
    enabled: !!userId && !!conversationId,
    staleTime: 60_000,
  });

  // Hold the latest in-flight value so unmount can flush it. The ref is
  // also the source of truth for the debounce — setDraft writes here and
  // schedules a debounced upsert; flush() reads here.
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const writeNow = useCallback(
    async (md: string) => {
      if (!userId || !conversationId) return;
      if (!isDraftsTableAvailable()) return;
      try {
        if (md.length === 0) {
          // Empty draft -> delete the row so the global drafts list does
          // not show an empty entry.
          await db
            .from('chat_message_drafts')
            .delete()
            .eq('user_id', userId)
            .eq('conversation_id', conversationId);
        } else {
          await db.from('chat_message_drafts').upsert(
            {
              user_id: userId,
              conversation_id: conversationId,
              body_md: md,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,conversation_id' },
          );
        }
        // Invalidate the all-drafts list so the Drafts tab updates.
        queryClient.invalidateQueries({ queryKey: ['chat-v2', 'all-drafts', userId] });
        // Update our own cache so a remount returns the latest value.
        queryClient.setQueryData<DraftRow | null>(queryKey, {
          body_md: md,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        if (isMissingTableError(err)) markDraftsTableMissing();
      }
    },
    [userId, conversationId, queryClient, queryKey],
  );

  const setDraft = useCallback(
    (md: string) => {
      pendingRef.current = md;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        const v = pendingRef.current;
        if (v === null) return;
        pendingRef.current = null;
        void writeNow(v);
      }, DEBOUNCE_MS);
    },
    [writeNow],
  );

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const v = pendingRef.current;
    if (v === null) return;
    pendingRef.current = null;
    await writeNow(v);
  }, [writeNow]);

  const clearDraft = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    if (!userId || !conversationId) return;
    if (!isDraftsTableAvailable()) return;
    try {
      await db
        .from('chat_message_drafts')
        .delete()
        .eq('user_id', userId)
        .eq('conversation_id', conversationId);
      queryClient.setQueryData<DraftRow | null>(queryKey, null);
      queryClient.invalidateQueries({ queryKey: ['chat-v2', 'all-drafts', userId] });
    } catch (err) {
      if (isMissingTableError(err)) markDraftsTableMissing();
    }
  }, [userId, conversationId, queryClient, queryKey]);

  // Flush on unmount or conversation switch so the next mount on the
  // same conversation re-seeds with the latest content.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const v = pendingRef.current;
      if (v === null) return;
      pendingRef.current = null;
      void writeNow(v);
    };
  }, [conversationId, writeNow]);

  return {
    draft: data?.body_md ?? '',
    isLoading,
    setDraft,
    clearDraft,
    flush,
  };
}
