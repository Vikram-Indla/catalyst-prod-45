import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PresenceState } from '@/lib/presence';

interface SetPresenceArgs {
  state: Exclude<PresenceState, 'offline' | 'on_leave'>;
  /** Duration the manual override lasts (ms). Defaults to 4 h. */
  durationMs?: number;
}

/**
 * Manual presence override.
 * Rules (from planning spec):
 * – User can only override to a LESS available state (away, busy).
 * – User can explicitly set themselves back to available.
 * – "available" is set automatically by heartbeat; manual "available" clears
 *   any prior manual_until so the heartbeat resumes control.
 * – Cannot force available when idle — if user is idle (heartbeat would
 *   write "away"), a manual "available" still writes to DB but the heartbeat
 *   loop will correct it to "away" on the next tick unless the user acts.
 * – manual_until is set for busy state (persists across sessions until expiry).
 * – away never gets a manual_until (it's a transient state, auto-managed).
 */
export function usePresence() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ state, durationMs = 4 * 60 * 60 * 1000 }: SetPresenceArgs) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const manual_until = state === 'busy'
        ? new Date(now.getTime() + durationMs).toISOString()
        : null;   // available/away: clear manual override

      const { error } = await supabase.from('user_presence').upsert(
        {
          user_id:      user.id,
          state,
          last_seen_at: now.toISOString(),
          manual_until,
          updated_at:   now.toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate any useUserStatus queries that might include the current user
      queryClient.invalidateQueries({ queryKey: ['user-status'] });
    },
  });

  return {
    setPresence: mutation.mutate,
    setPresenceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Read own EFFECTIVE presence state from v_user_effective_status.
 * This view returns on_leave when there is an active user_availability row,
 * so the ring updates automatically after scheduling leave — no separate
 * write to user_presence is needed.
 */
export function useOwnPresence() {
  return useQuery({
    queryKey: ['own-presence'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('v_user_effective_status')
        .select('effective_state, back_on')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data) return null;
      return {
        state:   data.effective_state as PresenceState,
        back_on: data.back_on as string | null,
      };
    },
    staleTime: 15_000,
  });
}
