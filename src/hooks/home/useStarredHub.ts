// useStarredHub — the unified read for the Starred hub (For You "Starred" tab
// + /starred page). Reads EVERY row in user_starred_items regardless of type,
// categorises it, and resolves a display label.
//
// Why this exists: useForYouData's starred path renders only issues + planner
// tasks, so board/project/filter/dashboard stars (which already live in
// user_starred_items via the project/board bridges) never appeared — the
// "empty Starred tab while the sidebar shows a star" bug (2026-06-18).
//
// Label resolution (zero-assumption — never a typed default):
//   - work items   → summary from ph_issues (subtitle = issue_key). '—' if unsynced.
//   - everything else → metadata.label written at star-time. '—' if absent.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { StarredItemType, StarredMetadata } from './useStarredItems';

export type StarCategory = 'work_item' | 'container' | 'surface' | 'knowledge';

export const STAR_CATEGORY: Record<StarredItemType, StarCategory> = {
  // work items
  epic: 'work_item', feature: 'work_item', story: 'work_item', task: 'work_item',
  incident: 'work_item', defect: 'work_item', ph_issue: 'work_item',
  business_request: 'work_item', change_request: 'work_item',
  production_incident: 'work_item', business_gap: 'work_item', idea: 'work_item',
  // containers
  project: 'container', product: 'container',
  // surfaces
  board: 'surface', backlog: 'surface', dashboard: 'surface', filter: 'surface', roadmap: 'surface',
  // knowledge
  document: 'knowledge', theme: 'knowledge', objective: 'knowledge',
  dependency: 'knowledge', risk: 'knowledge',
};

export function categorizeStar(type: StarredItemType): StarCategory {
  return STAR_CATEGORY[type] ?? 'work_item';
}

export interface StarredHubRow {
  /** item_id — issue_key for work items, uuid for board/project, etc. */
  id: string;
  type: StarredItemType;
  category: StarCategory;
  /** Resolved display name. '—' when unknown (never a typed default). */
  label: string;
  subtitle?: string;
  /** Work-item issue_type for JiraIssueTypeIcon (work_item rows only). */
  issueType?: string;
  /** Work-item status label (e.g. "In QA") — drives the status lozenge. */
  status?: string;
  /** Work-item status_category (todo|inprogress|done) — drives lozenge colour. */
  statusCategory?: string;
  /** metadata.route for surface stars; work items route via openDetail(id). */
  route?: string;
  /** Project/product icon identity (from metadata) → renders the real ProjectIcon. */
  projectKey?: string;
  iconName?: string;
  iconColor?: string;
  avatarUrl?: string;
  starredAt: string;
}

interface RawStarRow {
  item_id: string;
  item_type: StarredItemType;
  metadata: StarredMetadata | null;
  starred_at: string;
}

const WORK_ITEM_CATEGORY: StarCategory = 'work_item';

export function useStarredHub() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['starred-hub', userId],
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<StarredHubRow[]> => {
      if (!userId) return [];

      const { data: rawData, error } = await supabase
        .from('user_starred_items')
        .select('item_id, item_type, metadata, starred_at')
        .eq('user_id', userId)
        .order('starred_at', { ascending: false });
      if (error) throw error;

      const rows = (rawData || []) as RawStarRow[];

      // Batch-resolve work-item labels from ph_issues (item_id = issue_key).
      const issueKeys = rows
        .filter(r => categorizeStar(r.item_type) === WORK_ITEM_CATEGORY)
        .map(r => r.item_id);
      const issueMap = new Map<string, { summary: string | null; issue_type: string | null; status: string | null; status_category: string | null }>();
      if (issueKeys.length > 0) {
        const { data: issues } = await supabase
          .from('ph_issues')
          .select('issue_key, summary, issue_type, status, status_category')
          .in('issue_key', issueKeys);
        (issues || []).forEach((i: { issue_key: string; summary: string | null; issue_type: string | null; status: string | null; status_category: string | null }) =>
          issueMap.set(i.issue_key, { summary: i.summary, issue_type: i.issue_type, status: i.status, status_category: i.status_category }),
        );
      }

      return rows.map((r): StarredHubRow => {
        const category = categorizeStar(r.item_type);
        if (category === WORK_ITEM_CATEGORY) {
          const hit = issueMap.get(r.item_id);
          return {
            id: r.item_id,
            type: r.item_type,
            category,
            label: hit?.summary ?? '—',
            subtitle: r.item_id,
            // Prefer the live issue_type; fall back to nothing (icon resolver
            // renders no icon rather than a wrong one — zero-assumption).
            issueType: hit?.issue_type ?? undefined,
            status: hit?.status ?? undefined,
            statusCategory: hit?.status_category ?? undefined,
            starredAt: r.starred_at,
          };
        }
        return {
          id: r.item_id,
          type: r.item_type,
          category,
          label: r.metadata?.label ?? '—',
          subtitle: r.metadata?.subtitle,
          route: r.metadata?.route,
          projectKey: r.metadata?.projectKey,
          iconName: r.metadata?.iconName,
          iconColor: r.metadata?.color,
          avatarUrl: r.metadata?.avatarUrl,
          starredAt: r.starred_at,
        };
      });
    },
  });
}
