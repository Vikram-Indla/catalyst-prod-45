/**
 * ProductHub Kanban — renders through the canonical KanbanBoardShell.
 *
 * Consumes a BoardAdapter<Request> produced by
 * buildProductHubBoardAdapter. The legacy CatalystKanban primitive this
 * page used to wrap was retired in Phase 7 of the Kanban consolidation;
 * every Catalyst board now flows through KanbanBoardShell + a hub-specific
 * BoardAdapter.
 *
 * What the shell supplies for free (no hub code):
 *   - Toolbar: search, avatar stack, basic filter popover, group-by,
 *     density, view settings, advanced filter entry point, ••• menu.
 *   - Pragmatic DnD board with the exact Jira-parity card surface.
 *   - Optimistic colMap + automatic re-sync on data refetch.
 *   - Request-typed icon (via the adapter's resolveIcon).
 *
 * Still owned here:
 *   - Data fetch (useRequestsBacklog).
 *   - Page-level filter state (search, selAssignees, filterSelected,
 *     groupBy) because it drives query keys.
 *   - Status-change mutation (Supabase update on ph_requests).
 *   - Detail panel drawer + create drawer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import { buildProductHubBoardAdapter } from '@/components/kanban/adapters/productHubBoardAdapter';
import { ProductChromeBand } from '@/components/product-hub/ProductChromeBand';
import { CreateRequestDrawer } from '@/components/producthub/shared/CreateRequestDrawer';
// jira-compare cycle 4 — RequestDetailPanel replaced by CatalystViewBusinessRequestV2.
// Legacy import retained as commented sunset breadcrumb.
// import { RequestDetailPanel } from '@/components/producthub/timeline/RequestDetailPanel';
import CatalystViewBusinessRequestV2 from '@/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.v2';
import { useRequestsBacklog } from '@/hooks/useRequestsBacklog';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useCatalystWorkflow } from '@/hooks/useCatalystWorkflow';
import { supabase } from '@/integrations/supabase/client';
import type { Request, RequestStatus } from '@/types/request';
import type { TimelineRequest } from '@/types/producthub/request';

/* ═════ Request → TimelineRequest adapter — unchanged from prior
        implementation; used only for the detail panel. ═════ */
function toTimelineInitiative(i: Request): TimelineRequest {
  return {
    id: i.id,
    initiative_key: i.initiative_key,
    title: i.title,
    description: i.description,
    status: i.status,
    assignee_id: i.assignee_id,
    assignee_name: i.assignee_name,
    business_owner_id: i.business_owner_id,
    reporter_id: i.reporter_id,
    reporter_name: i.reporter_name,
    department_id: i.department_id,
    department_name: i.department_name,
    department_code: null,
    target_quarter: i.target_quarter,
    business_ask_date: i.business_ask_date,
    kickoff_date: i.kickoff_date,
    target_complete: i.target_complete,
    progress: i.progress,
    sort_order: i.sort_order,
    risk_count: i.risk_count,
    is_archived: i.is_archived,
    score_strategic_alignment: i.score_strategic_alignment,
    score_business_impact: i.score_business_impact,
    score_time_urgency: i.score_time_urgency,
    score_resource_feasibility: i.score_resource_feasibility,
    computed_score: i.computed_score,
    created_at: i.created_at,
    updated_at: i.updated_at,
    health_status: i.health_status ?? null,
    business_value: i.business_value ?? null,
    ea_review: (i as { ea_review?: string | null }).ea_review ?? null,
    priority: (i as { priority?: string | null }).priority ?? null,
    on_roadmap: i.on_roadmap ?? false,
  };
}

export default function ProductHubKanbanPage() {
  const { data, isLoading } = useRequestsBacklog();
  const requests = useMemo<Request[]>(() => data?.data ?? [], [data]);
  const avatarsByName = useProfileAvatarsByName();

  /* ═════ Phase 5b (2026-05-02) — Per-product chrome.
     When mounted at /product-hub/:code/{boards,kanban}, look up the
     product so the page renders the same ProductChromeBand
     (Products → {Name} breadcrumb + product icon + H1) that
     /product-hub/:code/backlog already uses. Mirrors the lookup pattern
     in RequestListingPage so the two surfaces share visual chrome.
     When unscoped (/product-hub/kanban global view), behaviour is
     unchanged — the shell's CatalystPageHeader keeps showing
     "Product Kanban". ═════ */
  const { code: productCode } = useParams<{ code?: string }>();
  const { data: scopedProduct } = useQuery({
    queryKey: ['product-hub', 'product-by-code', productCode],
    enabled: !!productCode,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, code, name')
        .eq('code', productCode)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; code: string; name: string } | null;
    },
    staleTime: 5 * 60_000,
  });

  /* ═════ Workflow-driven columns. The 'Business Request' scheme governs
     every request on this board (per the Phase 1 seed). Editing a
     status name in /admin/workflows updates the column header here on
     next refetch. ═════ */
  const { statuses: workflowStatuses, isLoading: workflowLoading } =
    useCatalystWorkflow('Business Request');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<string | null>(null);
  const [, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  /* ═════ Page-owned filter + group-by state. ═════ */
  const [search, setSearch] = useState('');
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set());
  const [filterSelected, setFilterSelected] = useState<Record<string, string[]>>({});
  const [groupBy, setGroupBy] = useState<string>('none');

  const onFilterChange = useCallback((categoryId: string, values: string[]) => {
    setFilterSelected(prev => ({ ...prev, [categoryId]: values }));
  }, []);
  const onClearFilters = useCallback(() => {
    setFilterSelected({});
    setSelAssignees(new Set());
    setSearch('');
  }, []);

  /* ═════ Status-change mutation (drag between columns). ═════ */
  const qc = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RequestStatus }) => {
      const { error } = await (supabase as any).from('ph_requests')
        .update({ status: status as any, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ph-requests'] });
      qc.invalidateQueries({ queryKey: ['requests-backlog'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update request status');
    },
  });

  const onStatusChange = useCallback(
    (requestId: string, status: RequestStatus) => {
      statusMutation.mutate({ id: requestId, status });
    },
    [statusMutation],
  );

  /* ═════ Favorite toggle mutation. ═════ */
  const favoriteMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await (supabase as any).from('ph_requests')
        .update({ is_favorited: value, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ph-requests'] });
      qc.invalidateQueries({ queryKey: ['requests-backlog'] });
    },
  });

  const onToggleFavorite = useCallback(
    (requestId: string) => {
      const current = requests.find(i => i.id === requestId);
      if (!current) return;
      favoriteMutation.mutate({ id: requestId, value: !current.is_favorited });
    },
    [favoriteMutation, requests],
  );

  /* ═════ Detail panel routing. ═════ */
  const onCardClick = useCallback((requestId: string) => setSelectedId(requestId), []);

  /**
   * Per-column "+ Create request" — Jira-parity affordance threaded
   * through the canonical adapter. Maps the column id (`col-<slug>`)
   * back to a workflow status row, prefers an `slug_aliases` value
   * that's a valid `initiative_status` enum (so the insert doesn't
   * fail on a renamed slug like `demand_intake` before the migration
   * lands), and seeds the create drawer with that status.
   */
  const onCreateInColumn = useCallback((colId: string) => {
    const slug = colId.replace(/^col-/, '');
    const wf = (workflowStatuses as ReadonlyArray<{ slug: string; slug_aliases?: string[] | null }>).find(s => s.slug === slug);
    // Prefer the first alias when present — alias values are guaranteed
    // to be in the legacy `initiative_status` enum (the migration's
    // whole point of slug_aliases). Falls back to slug if aliases empty.
    const status = wf?.slug_aliases?.[0] ?? wf?.slug ?? null;
    setCreateInitialStatus(status);
    setShowCreate(true);
  }, [workflowStatuses]);
  const selectedInitiative = useMemo(
    () => (selectedId ? requests.find(i => i.id === selectedId) ?? null : null),
    [selectedId, requests],
  );
  const detailList = useMemo(() => requests.map(toTimelineInitiative), [requests]);

  /* ═════ Build the canonical adapter. ═════ */
  const adapter = useMemo(() => buildProductHubBoardAdapter({
    requests,
    avatarsByName,
    workflowStatuses,
    search,
    onSearchChange: setSearch,
    selAssignees,
    onSelAssigneesChange: setSelAssignees,
    filterSelected,
    onFilterChange,
    onClearFilters,
    groupBy,
    onGroupByChange: setGroupBy,
    onStatusChange,
    onToggleFavorite,
    onCardClick,
    onCreateInColumn,
  }), [
    requests, avatarsByName, workflowStatuses,
    search, selAssignees, filterSelected, groupBy,
    onFilterChange, onClearFilters,
    onStatusChange, onToggleFavorite, onCardClick, onCreateInColumn,
  ]);

  if (isLoading || workflowLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid #2563EB', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <>
      {/* Phase 5b (2026-05-02) — chrome band only on per-product routes
          (/product-hub/:code/boards|kanban). Global /product-hub/kanban
          stays on the shell's built-in CatalystPageHeader. */}
      {scopedProduct && (
        <div style={{ padding: '8px 24px 0' }}>
          <ProductChromeBand
            productName={scopedProduct.name}
            productColor={null}
          />
        </div>
      )}
      <KanbanBoardShell
        adapter={adapter}
        title="Product Kanban"
        hideTitleHeader={!!scopedProduct}
      />

      {selectedInitiative && (
        <CatalystViewBusinessRequestV2
          isOpen={!!selectedInitiative}
          onClose={() => setSelectedId(null)}
          requestKey={
            (selectedInitiative as { request_key?: string | null; initiative_key?: string | null })
              .request_key ??
            (selectedInitiative as { initiative_key?: string | null }).initiative_key ??
            null
          }
        />
      )}

      <CreateRequestDrawer
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateInitialStatus(null); }}
        initialStatus={createInitialStatus}
      />
    </>
  );
}
