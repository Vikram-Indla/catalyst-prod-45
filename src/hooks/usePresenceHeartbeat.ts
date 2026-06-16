import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
// IDLE_MS = 10 * 60 * 1000 (10 minutes) — defined in @/lib/presence
import { HEARTBEAT_MS, IDLE_MS, type PresenceState } from '@/lib/presence';
import { getGeoActiveState, isManualAwayActive } from '@/lib/geo-presence';

/**
 * Mount once in the app shell.
 * – Upserts user_presence every 45 s (available/away based on idle time).
 * – Tracks last user activity; after IDLE_MS (10 min) of no input → away.
 * – On visibilitychange (tab hidden) → marks last_seen stale so the 5-min
 *   server sweep can move the user to offline.
 * – On visibilitychange (tab visible again) → immediately heartbeats.
 * – Manual state is written via usePresence(); this hook only writes the
 *   auto states (available / away). It respects an existing manual_until:
 *   if the row already has manual_until > now, the heartbeat does NOT
 *   overwrite the manual state.
 */
export function usePresenceHeartbeat() {
  const lastActivityRef = useRef<number>(Date.now());
  const userIdRef       = useRef<string | null>(null);

  // Resolve auth.uid() once on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) userIdRef.current = user.id;
    });
  }, []);

  // Update last-activity timestamp on any user interaction
  useEffect(() => {
    const touch = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, touch, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, touch));
  }, []);

  const upsert = useCallback(async (override?: PresenceState) => {
    const uid = userIdRef.current;
    if (!uid) return;

    const idle = Date.now() - lastActivityRef.current > IDLE_MS;
    const activeGeoState = isManualAwayActive() ? 'away' : getGeoActiveState();
    const autoState: PresenceState = idle ? 'away' : activeGeoState;
    const state = override ?? autoState;

    await supabase.from('user_presence').upsert(
      {
        user_id:      uid,
        state,
        last_seen_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      },
      {
        onConflict:     'user_id',
        ignoreDuplicates: false,
      }
    );
  }, []);

  // Heartbeat every 45 000 ms
  useEffect(() => {
    const id = window.setInterval(() => upsert(), HEARTBEAT_MS);
    // Initial heartbeat on mount
    upsert();
    return () => window.clearInterval(id);
  }, [upsert]);

  // Tab visibility changes
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab regained focus — immediately heartbeat
        upsert();
      }
      // Tab hidden: don't explicitly set offline here; the server sweeper
      // (clean_stale_presence, every 5 min) handles it via STALE_MS.
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [upsert]);
}
