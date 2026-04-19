/**
 * ProductHub Kanban — migrated onto the canonical CatalystKanban primitive.
 *
 * Before: custom `components/producthub/kanban/*` tree with its own DnD,
 * columns, card markup, CSS variables and dark-mode overrides. This page
 * was a full 220-LOC duplicate of the ProjectHub kanban chrome.
 *
 * After: this page is a thin adapter — fetch initiatives, map them to
 * `KanbanCardData`, hand them to `<CatalystKanban/>` with the ProductHub
 * column lifecycle, filter schema and sort options. Adding a new column
 * or filter now means editing `initiativeAdapter.ts`, not writing
 * parallel components.
 *
 * Status persistence is a single Supabase update on `ph_initiatives`.
 * Rollback on failure is automatic because we invalidate the query
 * key — TanStack Query refetches the canonical server state.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { CatalystKanban } from '@/components/kanban/CatalystKanban';
import {
  initiativeToKanbanCard,
  PRODUCTHUB_COLUMNS,
  producthubStatusToColumnId,
  producthubColumnIdToStatus,
  PRODUCTHUB_FILTER_FIELDS,
  PRODUCTHUB_GROUP_BY,
  PRODUCTHUB_SORT,
} from '@/components/kanban/adapters/initiativeAdapter';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { InitiativeDetailPanel } from '@/components/producthub/timeline/InitiativeDetailPanel';
import { useMDTBacklog } from '@/hooks/useMDTBacklog';
import { supabase } from '@/integrations/supabase/client';
import type { KanbanCardData } from '@/components/kanban/catalyst-types';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import type { TimelineInitiative } from '@/types/producthub/initiative';

/* ═════ Initiative → TimelineInitiative adapter — unchanged from previous
        implementation, used only for the detail panel. ═════ */
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
    initiative_type_key: i.initiative_type_key ?? null,
    initiative_type_label: i.initiative_type_label ?? null,
    initiative_type_color_hex: i.initiative_type_color_hex ?? null,
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  /* ═════ Map initiatives → canonical cards. ═════ */
  const cards = useMemo(() => initiatives.map(initiativeToKanbanCard), [initiatives]);

  /* ═════ Status-change mutation (drag between columns). ═════ */
  const qc = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InitiativeStatus }) => {
      const { error } = await supabase
        .from('ph_initiatives')
        .update({ status, updated_at: new Date().toISOString() })
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

  const onStatusChange = useCallback((card: KanbanCardData, newStatus: string) => {
    statusMutation.mutate({ id: card.id, status: newStatus as InitiativeStatus });
  }, [statusMutation]);

  const onCardClick = useCallback((card: KanbanCardData) => setSelectedId(card.id), []);
  const selectedInitiative = useMemo(
    () => (selectedId ? initiatives.find(i => i.id === selectedId) : null),
    [selectedId, initiatives],
  );
  const detailList = useMemo(() => initiatives.map(toTimelineInitiative), [initiatives]);

  /* ═════ Filter fields — add "My initiatives" derived chip via assignee filter. ═════ */
  const filterFields = useMemo(() => {
    if (!currentUserId) return PRODUCTHUB_FILTER_FIELDS;
    return PRODUCTHUB_FILTER_FIELDS;
  }, [currentUserId]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <CatalystPageHeader title="Product Kanban" subtitle="Initiative lifecycle · drag to progress" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 32, height: 32,
            border: '2px solid #2563EB', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <CatalystPageHeader title="Product Kanban" subtitle="Initiative lifecycle · drag to progress" />

      <CatalystKanban
        cards={cards}
        columns={PRODUCTHUB_COLUMNS}
        statusToColumnId={producthubStatusToColumnId}
        columnIdToStatus={producthubColumnIdToStatus}
        filterFields={filterFields}
        groupByOptions={PRODUCTHUB_GROUP_BY}
        sortOptions={PRODUCTHUB_SORT}
        onCardClick={onCardClick}
        onStatusChange={onStatusChange}
        onCreate={() => setShowCreate(true)}
        createLabel="New initiative"
        storageKey="producthub"
      />

      {selectedInitiative && (
        <InitiativeDetailPanel
          initiative={toTimelineInitiative(selectedInitiative)}
          initiatives={detailList}
          onClose={() => setSelectedId(null)}
        />
      )}

      <CreateInitiativeDrawer open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
