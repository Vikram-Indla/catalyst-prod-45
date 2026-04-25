// @ts-nocheck
/**
 * useReleaseItems — lazy fetch of work items for a single release name
 * (matched against ph_issues.fix_versions[].name).
 *
 * Used only by ReleaseHealthUWV (Level 2 expand). Cached per release name.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReleaseItem {
  id: string;
  key: string;
  summary: string;
  issueType: string;
  status: string;
  statusCategory: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
}

export function useReleaseItems(
  projectKey: string | null | undefined,
  releaseName: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['release-uwv-items', projectKey, releaseName],
    enabled: !!projectKey && !!releaseName && enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<ReleaseItem[]> => {
      if (!projectKey || !releaseName) return [];

      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select(
          'issue_key, summary, issue_type, status, status_category, fix_versions, assignee_user_id, assignee_display_name, assignee_avatar_url',
        )
        .eq('project_key', projectKey)
        .is('deleted_at', null)
        .order('issue_key', { ascending: true })
        .limit(500);
      if (error) throw error;

      const filtered = (data ?? []).filter((row: any) => {
        const fv = row.fix_versions;
        const versions = Array.isArray(fv) ? fv : [];
        return versions.some((v: any) =>
          typeof v === 'string' ? v === releaseName : v?.name === releaseName,
        );
      });

      return filtered.map((r: any) => ({
        id: r.issue_key,
        key: r.issue_key,
        summary: r.summary ?? '',
        issueType: r.issue_type ?? 'Story',
        status: r.status ?? '',
        statusCategory: (r.status_category ?? '').toString(),
        assigneeId: r.assignee_user_id ?? null,
        assigneeName: r.assignee_display_name ?? null,
        assigneeAvatar: r.assignee_avatar_url ?? null,
      }));
    },
  });
}
