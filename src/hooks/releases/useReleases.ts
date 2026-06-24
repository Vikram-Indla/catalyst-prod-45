import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release, ReleaseListResponse, ReleaseStatus } from '@/types/phase3-releases';

// DB status (planning|in_progress|released|archived) -> phase3 cell status.
function toCellStatus(s: string | null | undefined): ReleaseStatus {
  if (s === 'released') return 'released';
  if (s === 'archived') return 'archived';
  return 'unreleased';
}

// Reads ph_releases for a project. Kept as a thin adapter so the existing
// modal duplicate-name checks keep working against real data.
export function useReleases(projectKey: string) {
  return useQuery({
    queryKey: ['releases', projectKey],
    queryFn: async (): Promise<ReleaseListResponse> => {
      const { data: project } = await supabase
        .from('ph_projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
      if (!project?.id) return { data: [] };

      const { data, error } = await supabase
        .from('ph_releases')
        .select('*')
        .eq('project_id', project.id)
        .order('sort_order')
        .order('target_date');
      if (error) throw new Error(error.message);

      const releases = (data ?? []).map((r: any) => ({
        ...r,
        status: toCellStatus(r.status),
      })) as unknown as Release[];
      return { data: releases };
    },
    staleTime: 30_000,
  });
}
