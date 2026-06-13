/**
 * usePresence — Catalyst Chat Presence Hook
 *
 * Manages:
 * - Heartbeat every 30s to keep user online
 * - Realtime subscription to presence changes in a conversation
 * - Typing indicator (broadcast on keystroke, timeout after 3s idle)
 * - Last-seen timestamps
 *
 * Usage:
 *   const { presenceList, currentUserPresence, isTyping, setTyping } = usePresence(conversationId);
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { PresenceUI, PresenceState, PresenceRealtimeEvent } from '@/lib/chat/presence.types';

interface UsePresenceOptions {
  conversationId: string | null;
  heartbeatIntervalMs?: number; // Default: 30000 (30s)
  typingTimeoutMs?: number; // Default: 3000 (3s)
  enabled?: boolean;
}

interface UsePresenceReturn {
  presenceList: PresenceUI[];
  currentUserPresence: PresenceState | null;
  isTyping: boolean;
  setTyping: (typing: boolean) => Promise<void>;
  recordMessage: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function usePresence({
  conversationId,
  heartbeatIntervalMs = 30000,
  typingTimeoutMs = 3000,
  enabled = true,
}: UsePresenceOptions): UsePresenceReturn {
  const [presenceList, setPresenceList] = useState<PresenceUI[]>([]);
  const [currentUserPresence, setCurrentUserPresence] = useState<PresenceState | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Heartbeat: keep user online every 30s
  const sendHeartbeat = useCallback(async () => {
    if (!conversationId || !enabled) return;

    try {
      const { data } = await supabase.rpc('ensure_presence', {
        conv_uuid: conversationId,
        heartbeat_interval_seconds: heartbeatIntervalMs / 1000,
      });

      // Update local presence state from RPC response
      if (data && data.length > 0) {
        const presence = data[0];
        setCurrentUserPresence({
          isOnline: true,
          isTyping: presence.typing_until ? new Date(presence.typing_until) > new Date() : false,
          lastSeenAt: presence.last_message_at ? new Date(presence.last_message_at) : null,
          lastSeenText: null, // Computed server-side in get_conversation_presence
        });
      }
    } catch (err) {
      console.error('[usePresence] Heartbeat failed:', err);
      setError(err instanceof Error ? err : new Error('Heartbeat failed'));
    }
  }, [conversationId, enabled, supabase, heartbeatIntervalMs]);

  // Typing indicator: broadcast typing state
  const handleSetTyping = useCallback(
    async (typing: boolean) => {
      if (!conversationId || !enabled) return;

      try {
        const { data } = await supabase.rpc('set_typing', {
          conv_uuid: conversationId,
          is_typing: typing,
        });

        setIsTyping(typing);

        // Clear any pending typing timeout
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
        }

        // If turning typing ON, set a timeout to auto-clear it after 3s of inactivity
        if (typing) {
          typingTimerRef.current = setTimeout(() => {
            handleSetTyping(false);
          }, typingTimeoutMs);
        }
      } catch (err) {
        console.error('[usePresence] Set typing failed:', err);
        setError(err instanceof Error ? err : new Error('Set typing failed'));
      }
    },
    [conversationId, enabled, supabase, typingTimeoutMs]
  );

  // Record message: update last_message_at and clear typing
  const handleRecordMessage = useCallback(async () => {
    if (!conversationId || !enabled) return;

    try {
      // Clear typing first
      if (isTyping) {
        await handleSetTyping(false);
      }

      // Record message timestamp
      const { data } = await supabase.rpc('record_last_message', {
        conv_uuid: conversationId,
      });

      if (data && data.length > 0) {
        const presence = data[0];
        setCurrentUserPresence((prev) => ({
          ...prev,
          lastSeenAt: presence.last_message_at ? new Date(presence.last_message_at) : null,
          isTyping: false,
        }));
      }
    } catch (err) {
      console.error('[usePresence] Record message failed:', err);
      setError(err instanceof Error ? err : new Error('Record message failed'));
    }
  }, [conversationId, enabled, supabase, isTyping, handleSetTyping]);

  // Load initial presence + subscribe to Realtime
  useEffect(() => {
    if (!conversationId || !enabled) return;

    const initPresence = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load initial presence list
        const { data } = await supabase.rpc('get_conversation_presence', {
          conv_uuid: conversationId,
        });

        if (data) {
          setPresenceList(
            data.map((row: any) => ({
              id: row.id,
              user_id: row.user_id,
              user_name: row.user_name,
              user_avatar: row.user_avatar,
              status: row.status,
              is_typing: row.is_typing,
              last_message_at: row.last_message_at,
              last_seen_text: row.last_seen_text,
            }))
          );
        }

        // Ensure current user has a presence row
        await sendHeartbeat();

        // Subscribe to Realtime updates
        const channel = supabase
          .channel(`ph_presence:conversation=${conversationId}`)
          .on<PresenceRealtimeEvent>(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'ph_presence',
              filter: `conversation_id=eq.${conversationId}`,
            },
            (event) => {
              // Reload presence list on any change
              supabase
                .rpc('get_conversation_presence', { conv_uuid: conversationId })
                .then(({ data }) => {
                  if (data) {
                    setPresenceList(
                      data.map((row: any) => ({
                        id: row.id,
                        user_id: row.user_id,
                        user_name: row.user_name,
                        user_avatar: row.user_avatar,
                        status: row.status,
                        is_typing: row.is_typing,
                        last_message_at: row.last_message_at,
                        last_seen_text: row.last_seen_text,
                      }))
                    );
                  }
                });
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        console.error('[usePresence] Init failed:', err);
        setError(err instanceof Error ? err : new Error('Init failed'));
      } finally {
        setIsLoading(false);
      }
    };

    initPresence();

    // Start heartbeat timer
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, heartbeatIntervalMs);

    // Cleanup on unmount or conversation change
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [conversationId, enabled, supabase, sendHeartbeat, heartbeatIntervalMs]);

  return {
    presenceList,
    currentUserPresence,
    isTyping,
    setTyping: handleSetTyping,
    recordMessage: handleRecordMessage,
    isLoading,
    error,
  };
}
