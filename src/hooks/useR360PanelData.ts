/**
 * useR360PanelData — data hooks for the R360Panel embedded in the For You tab.
 *
 * useMyR360ResourceId
 *   Resolves the current auth user's resource_inventory.id by joining on
 *   profile_id. Returns null while loading or if no matching row exists.
 *
 * useTeamResourceIds
 *   For team leads: returns the list of resource_inventory rows for everyone
 *   else assigned to any project where the lead is a member. Used to populate
 *   the team-member picker in R360Panel.
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

      // 1 — Projects where the current user is a lead (not just a member)
      const { data: myMemberships } = await typedQuery('ph_project_members')
        .select('project_id')
        .eq('user_id', myProfileId)
        .eq('role', 'lead');

      const projectIds = (myMemberships ?? [])
        .map((m: any) => m.project_id as string)
        .filter(Boolean);

      if (!projectIds.length) return [];

      // 2 — Other members on those projects (deduplicated profile IDs)
      const { data: members } = await typedQuery('ph_project_members')
        .select('user_id')
        .in('project_id', projectIds)
        .neq('user_id', myProfileId);

      const profileIds = [
        ...new Set((members ?? []).map((m: any) => m.user_id as string).filter(Boolean)),
      ];

      if (!profileIds.length) return [];

      // 3 — Look up resource_inventory for those profiles
      const { data: resources } = await typedQuery('resource_inventory')
        .select('id, name, role_name, avatar_url')
        .in('profile_id', profileIds)
        .eq('is_active', true);

      return ((resources ?? []) as any[]).map(r => ({
        id:        r.id        as string,
        name:      r.name      as string,
        role_name: r.role_name as string | null,
        avatar_url: r.avatar_url as string | null,
      }));
    },
    enabled: !!myProfileId,
    staleTime: 5 * 60 * 1000,
  });
}
