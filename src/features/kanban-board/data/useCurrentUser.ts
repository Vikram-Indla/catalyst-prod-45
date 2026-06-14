/**
 * useCurrentUser — resolves the signed-in user's display name + jira account id
 * from auth + profiles (shared data source). For "Assign to me".
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CurrentUser { id: string; displayName: string | null; jiraAccountId: string | null; }

export function useCurrentUser(): CurrentUser | null {
  const { data } = useQuery({
    queryKey: ['kb-current-user'],
    queryFn: async (): Promise<CurrentUser | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles').select('full_name, jira_account_id').eq('id', user.id).maybeSingle();
      return {
        id: user.id,
        displayName: (profile as any)?.full_name ?? null,
        jiraAccountId: (profile as any)?.jira_account_id ?? null,
      };
    },
    staleTime: 5 * 60_000,
  });
  return data ?? null;
}
