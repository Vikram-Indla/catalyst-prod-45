// @ts-nocheck
/**
 * useReleaseItems — lazy fetch of work items for a single release name
 * (matched against ph_issues.fix_versions JSONB array of {id, name}).
 *
 * Used only by ReleaseHealthUWV (Level 2 expand). Cached per release name.
 *
 * NOTES:
 *   - Releases span multiple projects → no project_key filter.
 *   - fix_versions is JSONB [{ id, name, ... }] → use .contains() match.
 *   - ph_issues has no assignee_avatar_url column; Avatar resolves by name.
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

const SELECT_COLS =
  'issue_key, summary, issue_type, status, status_category, fix_versions, assignee_user_id, assignee_display_name';

function mapRow(r: any): ReleaseItem {
  return {
    id: r.issue_key,
    key: r.issue_key,
    summary: r.summary ?? '',
    issueType: r.issue_type ?? 'Story',
    status: r.status ?? '',
    statusCategory: (r.status_category ?? '').toString(),
    assigneeId: r.assignee_user_id ?? null,
    assigneeName: r.assignee_display_name ?? null,
    assigneeAvatar: null,
  };
}

export function useReleaseItems(
  _projectKey: string | null | undefined,
  releaseName: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['release-uwv-items', releaseName],
    enabled: !!releaseName && enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<ReleaseItem[]> => {
      if (!releaseName) return [];

      // Primary: JSONB contains match on fix_versions array of {name}.
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select(SELECT_COLS)
        .is('deleted_at', null)
        .contains('fix_versions', JSON.stringify([{ name: releaseName }]))
        .order('issue_key', { ascending: true })
        .limit(500);

      if (!error && data && data.length > 0) {
        return data.map(mapRow);
      }

      if (error) {
        console.warn('[useReleaseItems] contains query failed, trying fallback:', error.message);
      }

      // Fallback: fetch a wider page and filter client-side. Used only when
      // .contains() returns 0 (e.g. when fix_versions stored as plain strings).
      const { data: fallback, error: fallbackErr } = await (supabase as any)
        .from('ph_issues')
        .select(SELECT_COLS)
        .is('deleted_at', null)
        .not('fix_versions', 'is', null)
        .order('issue_key', { ascending: true })
        .limit(2000);

      if (fallbackErr) throw fallbackErr;

      const filtered = (fallback ?? []).filter((row: any) => {
        const fv = row.fix_versions;
        if (!Array.isArray(fv)) return false;
        return fv.some((v: any) =>
          typeof v === 'string' ? v === releaseName : v?.name === releaseName,
        );
      });

      return filtered.map(mapRow);
    },
  });
}
