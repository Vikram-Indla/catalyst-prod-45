/**
 * useLinkedEntities — what depends on a saved filter (Phase E / gap G3).
 *
 * Replaces the per-page `useLinkedEntities` stubs that returned []. A saved
 * filter can back: (1) Kanban boards via `boards.filter_id`, and (2) derived
 * roadmap/dashboard views via `filter_derived_views.source_filter_id`. This
 * hook surfaces both so the builder's impact Flag and the detail page's
 * derived-views section can show real dependents before an edit/delete.
 *
 * Mirrors the query shape in useFilterDerivedViews / useExistingBoardForFilter.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LinkedFilterEntity {
  /** Display type, e.g. "Kanban board", "Roadmap", "Dashboard". */
  type: string;
  name: string;
  href?: string;
}

const DERIVED_TYPE_LABEL: Record<string, string> = {
  roadmap: 'Roadmap',
  dashboard: 'Dashboard',
};

/** Pure mapper — kept separate so it is unit-testable without the DB. */
export function mapLinkedEntities(
  boards: Array<{ id: string; name: string }>,
  views: Array<{ id: string; title: string; type: string }>,
): LinkedFilterEntity[] {
  const boardEntities = boards.map(b => ({ type: 'Kanban board', name: b.name }));
  // Unknown derived-view type → show the raw type rather than inventing a label
  // (zero-assumption rule: no lie about what kind of view it is).
  const viewEntities = views.map(v => ({
    type: DERIVED_TYPE_LABEL[v.type] ?? v.type,
    name: v.title,
  }));
  return [...boardEntities, ...viewEntities];
}

export function useLinkedEntities(filterId: string | null): LinkedFilterEntity[] {
  const { data } = useQuery({
    queryKey: ['linked-entities', filterId],
    queryFn: async (): Promise<LinkedFilterEntity[]> => {
      if (!filterId) return [];
      const [boardsRes, viewsRes] = await Promise.all([
        (supabase as any)
          .from('boards')
          .select('id, name')
          .eq('filter_id', filterId)
          .is('deleted_at', null),
        (supabase as any)
          .from('filter_derived_views')
          .select('id, title, type')
          .eq('source_filter_id', filterId),
      ]);
      if (boardsRes.error) throw new Error(boardsRes.error.message);
      if (viewsRes.error) throw new Error(viewsRes.error.message);
      return mapLinkedEntities(boardsRes.data ?? [], viewsRes.data ?? []);
    },
    enabled: !!filterId,
    staleTime: 60_000,
  });
  return data ?? [];
}
