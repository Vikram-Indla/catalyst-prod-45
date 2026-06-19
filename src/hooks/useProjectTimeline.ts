import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface SprintMilestone {
  name: string;
  releaseDate: string; // ISO date
  id: string;
  confidence?: 'high' | 'medium' | 'low' | 'released' | 'draft';
  storyCount?: number;
}

export interface ProjectTimelineData {
  sprints: SprintMilestone[];
  projectKey: string;
}

/**
 * useProjectTimeline — fetches ph_issues for a project, extracts sprint_release JSONB,
 * and returns milestone data for timeline rendering. Each sprint becomes a dot with
 * count of stories in that sprint.
 */
export function useProjectTimeline(projectKey: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-timeline', projectKey],
    queryFn: async (): Promise<ProjectTimelineData> => {
      if (!projectKey) return { sprints: [], projectKey: '' };

      const { data: issues, error } = await (supabase as any)
        .from('ph_issues')
        .select('id, sprint_release')
        .eq('project_key', projectKey)
        .is('jira_removed_at', null)
        .is('deleted_at', null);

      if (error) throw error;

      const sprintMap = new Map<string, { releaseDate: string; count: number }>();

      for (const issue of issues ?? []) {
        const sprintRelease = issue.sprint_release;
        if (Array.isArray(sprintRelease)) {
          for (const sprint of sprintRelease) {
            const name = sprint.name ?? 'Unknown Sprint';
            const releaseDate = sprint.releaseDate ?? new Date().toISOString();
            const key = `${name}|${releaseDate}`;

            if (!sprintMap.has(key)) {
              sprintMap.set(key, { releaseDate, count: 0 });
            }
            const entry = sprintMap.get(key)!;
            entry.count += 1;
          }
        }
      }

      const sprints: SprintMilestone[] = Array.from(sprintMap.entries())
        .map(([key, data]) => {
          const [name] = key.split('|');
          return {
            name,
            releaseDate: data.releaseDate,
            id: key,
            storyCount: data.count,
            confidence: data.count > 2 ? 'high' : data.count > 0 ? 'medium' : 'low',
          };
        })
        .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());

      return { sprints, projectKey };
    },
    enabled: !!projectKey && !!user,
    staleTime: 30_000,
  });
}
