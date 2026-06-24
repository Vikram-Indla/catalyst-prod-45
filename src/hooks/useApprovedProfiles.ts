import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo } from 'react';

export interface ApprovedProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  avatarUrl?: string;
  /** Jira account UUID — matches ph_issues.assignee_account_id. Null for non-Jira users. */
  jiraAccountId?: string | null;
}

/**
 * Hook to fetch ALL approved profiles from the system.
 * This is different from useAllTeamMembers which only returns users in teams.
 * Use this for reassignment modals where any user can be assigned.
 */
export function useApprovedProfiles() {
  const queryClient = useQueryClient();

  // Set up real-time subscription with debouncing
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`approved-profiles-sync`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['approved-profiles'] });
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['approved-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, jira_account_id')
        .eq('approval_status', 'APPROVED')
        .order('full_name', { ascending: true });

      if (error) throw error;

      return (data || []).map((profile) => {
        const name = profile.full_name || profile.email || 'Unknown';
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return {
          id: profile.id,
          name,
          initials,
          email: profile.email || '',
          avatarUrl: profile.avatar_url,
          jiraAccountId: (profile as any).jira_account_id ?? null,
        } as ApprovedProfile;
      });
    },
  });
}

/**
 * Returns a Set of lowercase full_names for all APPROVED profiles.
 * Use this to gate any user picker: only show entries whose label is in this set.
 */
export function useApprovedProfileNames(): Set<string> {
  const { data = [] } = useApprovedProfiles();
  return useMemo(() => new Set(data.map(p => p.name.toLowerCase()).filter(Boolean)), [data]);
}

/**
 * Returns a Map from jira_account_id → ApprovedProfile.
 * Use this to resolve ph_issues.assignee_account_id back to a canonical profile.
 */
export function useApprovedProfilesByJiraId(): Map<string, ApprovedProfile> {
  const { data = [] } = useApprovedProfiles();
  return useMemo(
    () => new Map(data.filter(p => p.jiraAccountId).map(p => [p.jiraAccountId!, p])),
    [data],
  );
}
