/**
 * useUserStatus — Read/write custom user status (emoji + message).
 *
 * Subscribes to realtime changes via Supabase. Provides mutations to
 * update status and clear it. Handles expiration cleanup on next sync.
 *
 * Usage:
 *   const { status, loading, error, setStatus, clearStatus } = useUserStatus(userId);
 *   setStatus('🟡', 'In a meeting');
 *   clearStatus();
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UserStatus {
  user_id: string;
  emoji: string;
  message: string;
  expires_at: string | null;
  updated_at: string;
}

export function useUserStatus(userId?: string | null) {
  const client = supabase;
  const [status, setStatusState] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!userId || !client) return;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await client
          .from('ph_user_status')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (err && err.code !== 'PGRST116') {
          // PGRST116 = no rows (new user, no status yet)
          throw err;
        }

        if (data) {
          // Check if expired
          if (data.expires_at && new Date(data.expires_at) < new Date()) {
            await client
              .from('ph_user_status')
              .update({ emoji: '🟢', message: '', expires_at: null })
              .eq('user_id', userId);
            setStatusState({
              user_id: userId,
              emoji: '🟢',
              message: '',
              expires_at: null,
              updated_at: new Date().toISOString(),
            });
          } else {
            setStatusState(data);
          }
        } else {
          // New user — initialize default
          setStatusState({
            user_id: userId,
            emoji: '🟢',
            message: '',
            expires_at: null,
            updated_at: new Date().toISOString(),
          });
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load status');
        console.error('[useUserStatus] fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Realtime subscription
    const ch = client
      .channel(`ph_user_status:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_user_status',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newStatus = payload.new as UserStatus;
            // Check if expired
            if (newStatus.expires_at && new Date(newStatus.expires_at) < new Date()) {
              // Status has expired; reset to default
              setStatusState({
                user_id: userId,
                emoji: '🟢',
                message: '',
                expires_at: null,
                updated_at: new Date().toISOString(),
              });
            } else {
              setStatusState(newStatus);
            }
          } else if (payload.eventType === 'DELETE') {
            setStatusState(null);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug(`[useUserStatus] subscribed to ${userId}`);
        }
      });

    setChannel(ch);

    return () => {
      if (ch) {
        client.removeChannel(ch);
      }
    };
  }, [userId, client]);

  const setStatus = useCallback(
    async (emoji: string, message: string, expiresAt: Date | null = null) => {
      if (!client || !userId) return;

      try {
        const { data, error: err } = await client.rpc('user_status_upsert', {
          p_emoji: emoji,
          p_message: message,
          p_expires_at: expiresAt ? expiresAt.toISOString() : null,
        });

        if (err) throw err;

        if (data) {
          setStatusState(data as UserStatus);
        }
      } catch (err) {
        console.error('[useUserStatus] setStatus failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to set status');
      }
    },
    [client, userId]
  );

  const clearStatus = useCallback(async () => {
    if (!client || !userId) return;

    try {
      const { data, error: err } = await client.rpc('user_status_clear');

      if (err) throw err;

      if (data) {
        setStatusState(data as UserStatus);
      }
    } catch (err) {
      console.error('[useUserStatus] clearStatus failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear status');
    }
  }, [client, userId]);

  return {
    status,
    loading,
    error,
    setStatus,
    clearStatus,
    emoji: status?.emoji ?? '🟢',
    message: status?.message ?? '',
    isExpired: status?.expires_at ? new Date(status.expires_at) < new Date() : false,
  };
}
