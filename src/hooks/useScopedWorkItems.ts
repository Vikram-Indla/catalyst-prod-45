/**
 * useScopedWorkItems — canonical scoped work-items hook (Phase 6, 2026-05-02).
 *
 * Single entry point that hides the source-table dispatch from callers:
 *
 *   { kind: 'project', id }  →  ph_work_items via useProjectWorkItems
 *   { kind: 'product', id }  →  ph_requests filtered by product_id
 *
 * Both branches return the same WorkItemRow[] shape, so WorkItemsTable
 * and the rest of the work-items chrome render identically without
 * knowing which hub mounted them. This is the data-side counterpart to
 * the parameterized WorkItemsListPage shell — see CLAUDE.md.
 *
 * The product branch maps ph_requests → WorkItemRow with conservative
 * defaults for project-specific fields (release_id, sort_order, etc.).
 * Enrichment (joined statuses, assignee profiles, type catalog) is
 * intentionally minimal in this first cut; iterate as needed.
 *
 * Depends on `ph_requests.product_id` existing — added via migration
 * on 2026-05-02. Until that runs, the product branch returns [] and
 * logs a console warning.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectWorkItems, type WorkItemRow } from './useProjectWorkItems';

export type WorkItemScope =
  | { kind: 'project'; id: string | undefined }
  | { kind: 'product'; id: string | undefined };

export type WorkItemSourceFilter = 'all' | 'catalyst' | 'jira';

/* ─────────────────────────────────────────────────────────────────────
   Map a single ph_requests row to the canonical WorkItemRow.
   Defaults are intentionally conservative — fields that don't apply to
   business-request entities default to null / 'standard' / etc.
   ───────────────────────────────────────────────────────────────────── */
function mapRequestRow(r: Record<string, any>): WorkItemRow {
  return {
    id: r.id,
    item_key: r.request_key ?? r.initiative_key ?? String(r.id ?? '').slice(0, 8),
    title: r.title ?? '',
    summary: r.description ?? r.title ?? '',
    item_type: 'business_request',
    priority: r.priority ?? 'medium',
    parent_id: null,
    assignee_id: r.assignee_id ?? null,
    due_date: r.target_complete ?? null,
    start_date: r.kickoff_date ?? null,
    is_flagged: false,
    flag_reason: null,
    sort_order: r.sort_order ?? 0,
    status_id: r.status ?? '',
    type_id: 'business_request',
    release_id: null,
    department: r.department_name ?? null,
    team: r.assigned_team ?? null,
    environment: null,
    security_level: 'standard',
    cycle_time_days: null,
    status_changed_at: null,
    resolution: null,
    type_name: 'Business Request',
    type_color: '#0052CC',
    type_icon: 'briefcase',
    type_level: 'work',
    status_name: r.status ?? 'New',
    status_category: 'todo',
    status_color: '#94A3B8',
    assignee_name: r.assignee_name ?? null,
    assignee_avatar: null,
    source: 'catalyst',
    sync_status: null,
    last_synced_at: null,
    jira_issue_id: null,
    release_name: null,
  };
}

/* ─────────────────────────────────────────────────────────────────────
   Hook.
   ───────────────────────────────────────────────────────────────────── */
export function useScopedWorkItems(
  scope: WorkItemScope,
  sourceFilter?: WorkItemSourceFilter,
) {
  /* Project branch — delegate to the canonical hook unchanged. */
  const projectQuery = useProjectWorkItems(
    scope.kind === 'project' ? scope.id : undefined,
    sourceFilter,
  );

  /* Product branch — query ph_requests directly. Once the
     ph_backlog_requests_view is recreated to expose product_id, this
     can switch to the view for richer enrichment for free. */
  const productQuery = useQuery({
    queryKey: ['ph-product-work-items', scope.kind === 'product' ? scope.id : null, sourceFilter],
    queryFn: async (): Promise<WorkItemRow[]> => {
      if (scope.kind !== 'product' || !scope.id) return [];

      // (supabase as any) — `ph_requests.product_id` is not yet in the
      // generated Database types. Generate types via Supabase CLI after
      // the column lands to drop this cast.
      const { data, error } = await (supabase as any)
        .from('ph_requests')
        .select(
          'id, request_key, initiative_key, title, description, status, priority, assignee_id, assignee_name, target_complete, kickoff_date, department_name, assigned_team, sort_order, product_id, created_at, updated_at',
        )
        .eq('product_id', scope.id)
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (error) {
        // Most likely cause until the migration runs:
        //   "column ph_requests.product_id does not exist"
        // Surface clearly but don't crash callers — return [] so the
        // page falls back to "no work items" empty state.
        console.warn('useScopedWorkItems(product) query error:', error.message);
        return [];
      }

      return (data || []).map(mapRequestRow);
    },
    enabled: scope.kind === 'product' && !!scope.id,
    staleTime: 30_000,
  });

  /* Return the active branch's query state, narrowed to a common shape. */
  if (scope.kind === 'project') {
    return projectQuery;
  }
  return productQuery;
}
