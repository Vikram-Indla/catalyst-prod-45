import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { UserStatus } from '@/lib/presence';
import { aggregateSharedScopes, type SharedScope, type SharedScopeRow } from './teamPulseScopes';

export interface TeamPulseMember extends UserStatus {
  sharedScopes: SharedScope[];
}

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
  members: TeamPulseMember[];
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

      // 1. Resolve audience + shared scope keys via shared_user_scopes (SECURITY DEFINER).
      //    New RPC not yet in generated supabase types → cast.
      const { data: scopeRows, error: rpcErr } = await (supabase as any)
        .rpc('shared_user_scopes', { viewer: user.id });

      if (rpcErr) { console.error('[useTeamPulse] shared_user_scopes rpc error:', rpcErr); throw rpcErr; }

      const { ids: sharedIds, scopeMap } = aggregateSharedScopes((scopeRows ?? []) as SharedScopeRow[]);
      if (sharedIds.length === 0) return { members: [], weekLeave: [] };

      // 2. Fetch effective status from v_user_effective_status
      const { data: statusRows, error: statusErr } = await supabase
        .from('v_user_effective_status')
        .select('user_id, full_name, avatar_url, last_seen_at, effective_state, leave_kind, leave_ends_at, back_on, backup_user_id')
        .in('user_id', sharedIds)
        .order('full_name');

      if (statusErr) { console.error('[useTeamPulse] v_user_effective_status error:', statusErr); throw statusErr; }

      const members: TeamPulseMember[] = (statusRows ?? []).map((r: any) => ({
        user_id:        r.user_id,
        full_name:      r.full_name,
        avatar_url:     r.avatar_url,
        last_seen_at:   r.last_seen_at,
        effective_state: r.effective_state,
        leave_kind:     r.leave_kind,
        leave_ends_at:  r.leave_ends_at,
        back_on:        r.back_on,
        backup_user_id: r.backup_user_id,
        sharedScopes:   scopeMap.get(r.user_id) ?? [],
      }));

      // 3. This-week leave entries from user_availability.
      //    No embedded profiles join: user_availability has no FK to profiles,
      //    so PostgREST cannot resolve `profiles:user_id(...)` (PGRST200). Names
      //    and avatars are resolved from `members` (v_user_effective_status is
      //    built FROM profiles, so it covers every sharedId).
      const { data: leaveRows, error: leaveErr } = await supabase
        .from('user_availability')
        .select('user_id, kind, starts_at, ends_at, note, backup_user_id')
        .in('user_id', sharedIds)
        .lte('starts_at', endOfWeek())
        .gte('ends_at', startOfWeek())
        .order('starts_at');

      if (leaveErr) { console.error('[useTeamPulse] user_availability error:', leaveErr); throw leaveErr; }

      const profileMap = new Map(
        members.map(m => [m.user_id, { full_name: m.full_name, avatar_url: m.avatar_url }]),
      );

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

  // Realtime: invalidate on user_presence OR user_availability changes.
  // user_availability must be included so other team members' Team Pulse
  // updates immediately when someone schedules or cancels leave — not just
  // on the 30-second staleTime tick.
  useEffect(() => {
    const handler = () => { void queryClient.invalidateQueries({ queryKey: ['team-pulse'] }); };
    const channel = supabase
      .channel('team-pulse-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' },     handler)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_availability' }, handler)
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  return result;
}

/**
 * useTeamPulseManagedTeam — manager-scoped variant.
 *
 * Returns presence + leave for every member on projects the current user
 * belongs to (union across all the user's ph_project_members rows).
 * Used exclusively in the Team Pulse tab (team_lead / admin only).
 */
export function useTeamPulseManagedTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const result = useQuery<TeamPulseData>({
    queryKey: ['team-pulse-managed', user?.id],
    queryFn: async () => {
      if (!user) return { members: [], weekLeave: [] };

      // 1. Projects this user belongs to.
      const { data: myMemberships, error: memErr } = await supabase
        .from('ph_project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (memErr || !myMemberships?.length) return { members: [], weekLeave: [] };

      const projectIds = myMemberships.map((m: any) => m.project_id);

      // 2. All other members in those projects (deduped).
      const { data: projectMembers, error: pmErr } = await supabase
        .from('ph_project_members')
        .select('user_id')
        .in('project_id', projectIds)
        .neq('user_id', user.id);

      if (pmErr || !projectMembers?.length) return { members: [], weekLeave: [] };

      const memberIds = [...new Set((projectMembers as any[]).map((m: any) => m.user_id as string))];

      // 3. Effective presence / leave status.
      const { data: statusRows, error: statusErr } = await supabase
        .from('v_user_effective_status')
        .select('user_id, full_name, avatar_url, last_seen_at, effective_state, leave_kind, leave_ends_at, back_on, backup_user_id')
        .in('user_id', memberIds)
        .order('full_name');

      if (statusErr) { console.error('[useTeamPulseManagedTeam] status error:', statusErr); throw statusErr; }

      const members: TeamPulseMember[] = ((statusRows ?? []) as any[]).map((r: any) => ({
        user_id:         r.user_id,
        full_name:       r.full_name,
        avatar_url:      r.avatar_url,
        last_seen_at:    r.last_seen_at,
        effective_state: r.effective_state,
        leave_kind:      r.leave_kind,
        leave_ends_at:   r.leave_ends_at,
        back_on:         r.back_on,
        backup_user_id:  r.backup_user_id,
        sharedScopes:    [],
      }));

      // 4. This-week leave entries.
      const { data: leaveRows } = await supabase
        .from('user_availability')
        .select('user_id, kind, starts_at, ends_at, note, backup_user_id')
        .in('user_id', memberIds)
        .lte('starts_at', endOfWeek())
        .gte('ends_at', startOfWeek())
        .order('starts_at');

      const profileMap = new Map(members.map(m => [m.user_id, { full_name: m.full_name, avatar_url: m.avatar_url }]));

      const weekLeave: TeamLeaveEntry[] = ((leaveRows ?? []) as any[]).map((r: any) => ({
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
    enabled: !!user,
  });

  useEffect(() => {
    const handler = () => { void queryClient.invalidateQueries({ queryKey: ['team-pulse-managed'] }); };
    const channel = supabase
      .channel('team-pulse-managed-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' },     handler)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_availability' }, handler)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  return result;
}
