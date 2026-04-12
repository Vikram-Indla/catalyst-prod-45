/**
 * Canonical hook — resolves a Jira account ID to an avatar URL.
 * Falls back through: jira_identity_map → profiles (catalyst_user_id) → profiles (direct).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCatalystAvatarProfile(accountId: string | null | undefined) {
  return useQuery({
    queryKey: ['cv-avatar', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      if (!accountId) return null;
      // 1. Try jira_identity_map
      const { data: jiraRow } = await supabase
        .from('jira_identity_map')
        .select('avatar_url, catalyst_user_id')
        .eq('jira_account_id', accountId)
        .maybeSingle();
      if (jiraRow?.avatar_url) return { avatar_url: jiraRow.avatar_url };
      // 2. Fallback: catalyst_user_id → profiles
      if (jiraRow?.catalyst_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', jiraRow.catalyst_user_id)
          .single();
        if (profile?.avatar_url) return profile;
      }
      // 3. Final fallback: try profiles directly
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', accountId)
        .maybeSingle();
      return profile;
    },
    staleTime: 60000,
  });
}
