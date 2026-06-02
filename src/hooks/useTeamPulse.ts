import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserStatus } from '@/lib/presence';

export interface TeamLeaveEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  kind: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
  backup_user_id: string | null;
}

export interface TeamPulseData {
  members: UserStatus[];
  weekLeave: TeamLeaveEntry[];
}

function startOfWeek(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString();
}

function endOfWeek(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  d.setDate(d.getDate() - d.getDay() + 6); // Saturday
  return d.toISOString();
}

export function useTeamPulse() {
  const queryClient = useQueryClient();

  const result = useQuery<TeamPulseData>({
    queryKey: ['team-pulse'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { members: [], weekLeave: [] };

      // 1. Resolve audience via shared_user_ids SECURITY DEFINER function
      const { data: sharedRows, error: rpcErr } = await supabase
        .rpc('shared_user_ids', { viewer: user.id });

      if (rpcErr) { console.error('[useTeamPulse] shared_user_ids rpc error:', rpcErr); throw rpcErr; }

      const sharedIds: string[] = (sharedRows ?? []).map((r: { shared_id: string }) => r.shared_id);
      if (sharedIds.length === 0) return { members: [], weekLeave: [] };

      // 2. Fetch effective status from v_user_effective_status
      const { data: statusRows, error: statusErr } = await supabase
        .from('v_user_effective_status')
        .select('user_id, full_name, avatar_url, last_seen_at, effective_state, leave_kind, leave_ends_at, back_on, backup_user_id')
        .in('user_id', sharedIds)
        .order('full_name');

      if (statusErr) { console.error('[useTeamPulse] v_user_effective_status error:', statusErr); throw statusErr; }

      const members: UserStatus[] = (statusRows ?? []).map((r: any) => ({
        user_id:        r.user_id,
        full_name:      r.full_name,
        avatar_url:     r.avatar_url,
        last_seen_at:   r.last_seen_at,
        effective_state: r.effective_state,
        leave_kind:     r.leave_kind,
        leave_ends_at:  r.leave_ends_at,
        back_on:        r.back_on,
        backup_user_id: r.backup_user_id,
      }));

      // 3. This-week leave entries from user_availability
      // Note: no FK exists on user_availability.user_id so we cannot use PostgREST's
      // embedded-join syntax. Profile data is resolved from already-fetched statusRows.
      const { data: leaveRows, error: leaveErr } = await supabase
        .from('user_availability')
        .select('user_id, kind, starts_at, ends_at, note, backup_user_id')
        .in('user_id', sharedIds)
        .lte('starts_at', endOfWeek())
        .gte('ends_at', startOfWeek())
        .order('starts_at');

      if (leaveErr) { console.error('[useTeamPulse] user_availability error:', leaveErr); throw leaveErr; }

      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      for (const r of (statusRows ?? [])) {
        profileMap.set((r as any).user_id, { full_name: (r as any).full_name, avatar_url: (r as any).avatar_url });
      }

      const weekLeave: TeamLeaveEntry[] = (leaveRows ?? []).map((r: any) => ({
        user_id:        r.user_id,
        full_name:      profileMap.get(r.user_id)?.full_name ?? null,
        avatar_url:     profileMap.get(r.user_id)?.avatar_url ?? null,
        kind:           r.kind,
        starts_at:      r.starts_at,
        ends_at:        r.ends_at,
        note:           r.note,
        backup_user_id: r.backup_user_id,
      }));

      return { members, weekLeave };
    },
    staleTime: 30_000,
  });

  // Realtime: invalidate on any user_presence change
  useEffect(() => {
    const channel = supabase
      .channel('team-pulse-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => { void queryClient.invalidateQueries({ queryKey: ['team-pulse'] }); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  return result;
}
