/**
 * useFixVersions — Fetches Jira-synced fix versions from ph_versions by project_key
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FixVersion {
  name: string;
  released: boolean;
  archived: boolean;
  release_date: string | null;
}

export function useFixVersions(projectKey: string | null | undefined) {
  const query = useQuery({
    queryKey: ['ph-fix-versions', projectKey],
    queryFn: async (): Promise<FixVersion[]> => {
      if (!projectKey) return [];
      const { data, error } = await supabase
        .from('ph_versions' as any)
        .select('name, released, archived, release_date')
        .eq('project_key', projectKey)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FixVersion[];
    },
    enabled: !!projectKey,
    staleTime: 60_000,
  });

  const versions = query.data ?? [];
  const unreleased = versions.filter(v => !v.released && !v.archived);
  const released = versions.filter(v => v.released && !v.archived);

  return { versions, unreleased, released, isLoading: query.isLoading };
}
