/**
 * ProductHub Kanban — renders through the canonical KanbanBoardShell.
 *
 * Consumes a BoardAdapter<Initiative> produced by
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
 *   - Initiative-typed icon (via the adapter's resolveIcon).
 *
 * Still owned here:
 *   - Data fetch (useMDTBacklog).
 *   - Page-level filter state (search, selAssignees, filterSelected,
 *     groupBy) because it drives query keys.
 *   - Status-change mutation (Supabase update on ph_initiatives).
 *   - Detail panel drawer + create drawer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import { buildProductHubBoardAdapter } from '@/components/kanban/adapters/productHubBoardAdapter';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { InitiativeDetailPanel } from '@/components/producthub/timeline/InitiativeDetailPanel';
import { useMDTBacklog } from '@/hooks/useMDTBacklog';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useCatalystWorkflow } from '@/hooks/useCatalystWorkflow';
import { supabase } from '@/integrations/supabase/client';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import type { TimelineInitiative } from '@/types/producthub/initiative';

/* ═════ Initiative → TimelineInitiative adapter — unchanged from prior
        implementation; used only for the detail panel. ═════ */
function toTimelineInitiative(i: Initiative): TimelineInitiative {
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
  const { data, isLoading } = useMDTBacklog();
  const initiatives = useMemo<Initiative[]>(() => data?.data ?? [], [data]);
  const avatarsByName = useProfileAvatarsByName();

  /* ═════ Workflow-driven columns. The 'Business Request' scheme governs
     every initiative on this board (per the Phase 1 seed). Editing a
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
    mutationFn: async ({ id, status }: { id: string; status: InitiativeStatus }) => {
      const { error } = await supabase
        .from('ph_initiatives')
        .update({ status: status as any, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ph-initiatives'] });
      qc.invalidateQueries({ queryKey: ['mdt-backlog'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update initiative status');
    },
  });

  const onStatusChange = useCallback(
    (initiativeId: string, status: InitiativeStatus) => {
      statusMutation.mutate({ id: initiativeId, status });
    },
    [statusMutation],
  );

  /* ═════ Favorite toggle mutation. ═════ */
  const favoriteMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from('ph_initiatives')
        .update({ is_favorited: value, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ph-initiatives'] });
      qc.invalidateQueries({ queryKey: ['mdt-backlog'] });
    },
  });

  const onToggleFavorite = useCallback(
    (initiativeId: string) => {
      const current = initiatives.find(i => i.id === initiativeId);
      if (!current) return;
      favoriteMutation.mutate({ id: initiativeId, value: !current.is_favorited });
    },
    [favoriteMutation, initiatives],
  );

  /* ═════ Detail panel routing. ═════ */
  const onCardClick = useCallback((initiativeId: string) => setSelectedId(initiativeId), []);

  /**
   * Per-column "+ Create initiative" — Jira-parity affordance threaded
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
    () => (selectedId ? initiatives.find(i => i.id === selectedId) ?? null : null),
    [selectedId, initiatives],
  );
  const detailList = useMemo(() => initiatives.map(toTimelineInitiative), [initiatives]);

  /* ═════ Build the canonical adapter. ═════ */
  const adapter = useMemo(() => buildProductHubBoardAdapter({
    initiatives,
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
    initiatives, avatarsByName, workflowStatuses,
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
      <KanbanBoardShell adapter={adapter} title="Product Kanban" />

      {selectedInitiative && (
        <InitiativeDetailPanel
          initiative={toTimelineInitiative(selectedInitiative)}
          initiatives={detailList}
          onClose={() => setSelectedId(null)}
        />
      )}

      <CreateInitiativeDrawer
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateInitialStatus(null); }}
        initialStatus={createInitialStatus}
      />
    </>
  );
}
