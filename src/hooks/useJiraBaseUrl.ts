import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useJiraBaseUrl(): string | null {
  const { data } = useQuery({
    queryKey: ['jira-base-url'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_jira_connection')
        .select('site_url')
        .single();
      if (error || !data?.site_url) return null;
      return data.site_url.replace(/\/$/, '');
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? null;
}
