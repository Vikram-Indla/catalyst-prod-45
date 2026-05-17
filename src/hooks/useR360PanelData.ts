/**
 * useR360PanelData — data hooks for the R360Panel embedded in the For You tab.
 *
 * useMyR360ResourceId
 *   Resolves the current auth user's resource_inventory.id by joining on
 *   profile_id. Returns null while loading or if no matching row exists.
 *
 * useTeamResourceIds
 *   For team leads: returns all active resource_inventory rows that have a
 *   profile_id set (i.e. linked to a real auth user), excluding the caller.
 *   ph_project_members is intentionally NOT used here — the project-membership
 *   table is sparsely populated and does not reflect the full team roster.
 */
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ─── My own resource_inventory ID ────────────────────────────────────────────

export function useMyR360ResourceId() {
  const { user } = useAuth();
  return useQuery<string | null>({
    queryKey: ['my-r360-resource-id', user?.id ?? ''],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await typedQuery('resource_inventory')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();
      return (data as any)?.id ?? null;
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });
}

// ─── Team members (for lead picker) ──────────────────────────────────────────

export interface TeamResourceEntry {
  id: string;        // resource_inventory.id — passed to R360MemberDetail
  name: string;
  role_name: string | null;
  avatar_url: string | null;
}

export function useTeamResourceIds(myProfileId: string | null | undefined) {
  return useQuery<TeamResourceEntry[]>({
    queryKey: ['team-resource-ids', myProfileId ?? ''],
    queryFn: async () => {
      if (!myProfileId) return [];

      // Query resource_inventory directly — all active resources linked to an
      // auth user (profile_id set), excluding the current user's own entry.
      // Sorted by name for a stable sidebar order.
      const { data: resources } = await typedQuery('resource_inventory')
        .select('id, name, role_name, avatar_url')
        .eq('is_active', true)
        .not('profile_id', 'is', null)
        .neq('profile_id', myProfileId)
        .order('name');

      // Exclude management roles — they are not delivery resources and should
      // not appear in the team picker (Management, Delivery Manager, etc.)
      const MGMT_PATTERNS = ['manager', 'management'];
      return ((resources ?? []) as any[])
        .filter(r => {
          const role = (r.role_name ?? '').toLowerCase();
          return !MGMT_PATTERNS.some(p => role.includes(p));
        })
        .map(r => ({
          id:         r.id         as string,
          name:       r.name       as string,
          role_name:  r.role_name  as string | null,
          avatar_url: r.avatar_url as string | null,
        }));
    },
    enabled: !!myProfileId,
    // Tightened from 5 minutes → 30 seconds. The previous 5-min cache caused
    // post-migration / post-role-change state to persist far too long — e.g.
    // when the orphan-profile fix landed (2026-05-17) the team list kept
    // returning the pre-migration result until the user manually hard-
    // refreshed. 30s is still long enough to coalesce tab-switch refetches
    // but short enough that DB corrections become visible in seconds, not
    // minutes. Refetch on window focus picks up the rest.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
