/**
 * useDefectsIncidents — real-data hook for the Defect Summary report (B1 group 6, hybrid D-005).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 *
 * SOURCE (CAT-TESTHUB-REBUILD-20260704-001, Phase C Wave 3, D052): defects are
 * read from tm_defects — the only defect source (ph_issues carries zero QA
 * Bug/Defect rows). The prior query read ph_issues and returned an empty set,
 * and counted "open" as everything whose status_category !== 'Done', which
 * bucketed CLOSED and RESOLVED as open.
 *
 * BUCKETING — tm_defect_status enum values are lowercase (open, in_progress,
 * resolved, closed, reopened). "Open" counts ONLY status='open' (reopened is
 * a distinct enum value, surfaced under in_progress). resolved + closed are
 * terminal and are NEVER counted as open.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from './fetchAllPages';

export interface IssueRow {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
}

export interface DefectsIncidents {
  defectsTotal: number;
  defectsOpen: number;
  defectsInProgress: number;
  defectsResolved: number;
  defectsClosed: number;
  tmDefects: number;
  openDefects: IssueRow[];
}

interface TmDefectRow {
  defect_key: string | null;
  title: string | null;
  status: string | null;
}

// tm_defect_status enum → display + coarse category. Zero-assumption: an
// unknown status maps to itself and is treated as non-terminal (not counted
// as resolved/closed), never silently rebucketed.
const STATUS_DISPLAY: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};
const STATUS_CATEGORY: Record<string, string> = {
  open: 'To Do',
  in_progress: 'In Progress',
  reopened: 'In Progress',
  resolved: 'Done',
  closed: 'Done',
};

export function useDefectsIncidents(projectName?: string, projectId?: string) {
  return useQuery({
    queryKey: ['defects-incidents', projectName, projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<DefectsIncidents> => {
      const rows = await fetchAllPages<TmDefectRow>((from, to) =>
        supabase
          .from('tm_defects')
          .select('defect_key, title, status')
          .eq('project_id', projectId!)
          .order('created_at', { ascending: false, nullsFirst: false })
          .order('defect_key', { ascending: true })
          .range(from, to),
      );

      const issues: IssueRow[] = rows.map((d) => {
        const s = (d.status ?? '').toLowerCase();
        return {
          issue_key: d.defect_key ?? '—',
          summary: d.title ?? '',
          status: STATUS_DISPLAY[s] ?? d.status ?? '—',
          status_category: STATUS_CATEGORY[s] ?? '—',
        };
      });

      const count = (s: string) =>
        rows.filter((d) => (d.status ?? '').toLowerCase() === s).length;

      const defectsOpen = count('open');
      const defectsInProgress = count('in_progress') + count('reopened');
      const defectsResolved = count('resolved');
      const defectsClosed = count('closed');

      // "Open defects" table = anything not terminal (open + in_progress +
      // reopened) — the work still in flight. resolved/closed excluded.
      const openList = issues.filter(
        (i) => i.status_category !== 'Done' && i.status_category !== '—',
      );

      return {
        defectsTotal: rows.length,
        defectsOpen,
        defectsInProgress,
        defectsResolved,
        defectsClosed,
        tmDefects: rows.length,
        openDefects: openList.slice(0, 100),
      };
    },
  });
}
