import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo } from 'react';

export interface ApprovedProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  /** Resolved avatar URL. Priority: admin override > profiles.avatar_url > null (→ initials). */
  avatarUrl?: string | null;
  /** Jira account UUID — matches ph_issues.assignee_account_id. Null for non-Jira users. */
  jiraAccountId?: string | null;
}

/**
 * Fetches all APPROVED profiles merged with admin avatar overrides from
 * catalyst_resource_avatars. This is the single source of truth for every
 * user picker in Catalyst.
 *
 * Avatar priority: catalyst_resource_avatars.avatar_url > profiles.avatar_url > null
 *
 * Business rules enforced here:
 *   - Only approval_status = 'APPROVED' users are returned.
 *   - Avatar shown in any picker = the override set at /admin/avatars if present.
 */
export function useApprovedProfiles() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`approved-profiles-sync`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['approved-profiles'] });
        }, 1000);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['approved-profiles'],
    queryFn: async () => {
      // Fetch approved profiles and avatar overrides in parallel
      const [profilesResult, overridesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, jira_account_id')
          .eq('approval_status', 'APPROVED')
          .order('full_name', { ascending: true }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from as any)('catalyst_resource_avatars')
          .select('profile_id, avatar_url'),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      // Build override map: profile_id → avatar_url
      const overrideMap = new Map<string, string>();
      if (Array.isArray(overridesResult.data)) {
        for (const row of overridesResult.data as { profile_id: string; avatar_url: string }[]) {
          if (row.profile_id && row.avatar_url) overrideMap.set(row.profile_id, row.avatar_url);
        }
      }

      return (profilesResult.data || []).map((profile) => {
        const name = profile.full_name || profile.email || 'Unknown';
        const initials = name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        // Override wins over profiles.avatar_url
        const avatarUrl = overrideMap.get(profile.id) ?? (profile.avatar_url as string | null) ?? null;

        return {
          id: profile.id,
          name,
          initials,
          email: profile.email || '',
          avatarUrl,
          jiraAccountId: (profile as any).jira_account_id ?? null,
        } as ApprovedProfile;
      });
    },
  });
}

/**
 * Returns a Set of lowercase full_names for all APPROVED profiles.
 */
export function useApprovedProfileNames(): Set<string> {
  const { data = [] } = useApprovedProfiles();
  return useMemo(() => new Set(data.map(p => p.name.toLowerCase()).filter(Boolean)), [data]);
}

/**
 * Returns a Map from jira_account_id → ApprovedProfile.
 */
export function useApprovedProfilesByJiraId(): Map<string, ApprovedProfile> {
  const { data = [] } = useApprovedProfiles();
  return useMemo(
    () => new Map(data.filter(p => p.jiraAccountId).map(p => [p.jiraAccountId!, p])),
    [data],
  );
}
