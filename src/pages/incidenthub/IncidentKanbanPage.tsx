/**
 * IncidentKanbanPage — migrated onto the canonical CatalystKanban primitive.
 *
 * Before: bespoke 148-LOC inline board with hand-rolled columns, custom
 * card markup, hardcoded colour tokens and no filter surface.
 *
 * After: thin adapter — useIncidentListView → incidentToKanbanCard →
 * <CatalystKanban/>. Filter by severity / project / priority / SLA,
 * swimlane by severity or project, sort by recency / severity /
 * breached-first. Read-only today (status mutations are deliberately
 * disabled — see adapter header comment).
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon } from 'lucide-react';
import { useIncidentListView } from '@/hooks/useIncidentHub';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { CatalystKanban } from '@/components/kanban/CatalystKanban';
import {
  incidentToKanbanCard,
  INCIDENTHUB_COLUMNS,
  incidentStatusToColumnId,
  incidentColumnIdToStatus,
  INCIDENTHUB_FILTER_FIELDS,
  INCIDENTHUB_GROUP_BY,
  INCIDENTHUB_SORT,
  type IncidentRow,
} from '@/components/kanban/adapters/incidentAdapter';
import { NewIncidentModal } from './components/NewIncidentModal';
import { Skeleton } from '@/components/ui/skeleton';
import type { KanbanCardData } from '@/components/kanban/catalyst-types';

export default function IncidentKanbanPage() {
  const navigate = useNavigate();
  const { data: incidents, isLoading } = useIncidentListView();
  const [showCreate, setShowCreate] = useState(false);

  const cards = useMemo(
    () => (incidents ?? []).map(incidentToKanbanCard),
    [incidents],
  );

  const onCardClick = useCallback((card: KanbanCardData) => {
    navigate(`/incident-hub/view/${card.id}`);
  }, [navigate]);

  /* ═════ Breached-indicator footer slot — hub-specific chrome. ═════ */
  const renderCardFooter = useCallback((card: KanbanCardData) => {
    const row = card.raw as IncidentRow;
    if (!row.resolution_breached) return null;
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 600, color: '#B91C1C',
        fontFamily: "'Inter', sans-serif",
      }}>
        <AlertOctagon size={12} />
        <span>SLA breached</span>
      </div>
    );
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <CatalystPageHeader title="Incident Kanban" subtitle="Production incidents · live status" />
        <div style={{ flex: 1, padding: 24 }}>
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <CatalystPageHeader title="Incident Kanban" subtitle="Production incidents · live status" />

      <CatalystKanban
        cards={cards}
        columns={INCIDENTHUB_COLUMNS}
        statusToColumnId={incidentStatusToColumnId}
        columnIdToStatus={incidentColumnIdToStatus}
        filterFields={INCIDENTHUB_FILTER_FIELDS}
        groupByOptions={INCIDENTHUB_GROUP_BY}
        sortOptions={INCIDENTHUB_SORT}
        onCardClick={onCardClick}
        /* onStatusChange deliberately omitted — see incidentAdapter.ts header. */
        onCreate={() => setShowCreate(true)}
        createLabel="New incident"
        storageKey="incidenthub"
        renderCardFooter={renderCardFooter}
      />

      <NewIncidentModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
