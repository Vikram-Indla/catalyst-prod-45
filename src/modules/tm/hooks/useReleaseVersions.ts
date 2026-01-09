// =====================================================
// RELEASE VERSIONS HOOK
// React Query hooks for release version operations
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReleaseVersion {
  id: string;
  version: string;
  name: string | null;
  status: string | null;
  release_date: string | null;
}

export const releaseVersionKeys = {
  all: ['release_versions'] as const,
};

// Get all release versions
export function useReleaseVersions() {
  return useQuery({
    queryKey: releaseVersionKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_versions')
        .select('id, version, name, status, release_date')
        .order('version', { ascending: false });

      if (error) throw error;
      return (data || []) as ReleaseVersion[];
    },
  });
}
