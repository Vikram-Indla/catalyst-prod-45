/**
 * IncidentHub Kanban Page — /incident-hub/kanban
 *
 * Migrated onto the canonical KanbanBoardShell (Phase 5 of the Catalyst
 * Kanban consolidation).
 *
 * Before: bespoke 5-column flex grid with a custom card surface, no
 *         drag-drop, click-to-navigate only.
 * After : <KanbanBoardShell adapter={buildIncidentHubBoardAdapter(...)}/>
 *
 * Behaviour contract — IncidentHub is Jira-sourced and READ-ONLY for
 * status. The adapter receives drops and the page translates them into
 * a toast + refetch, leaving the underlying Jira record untouched. Users
 * are told to manage status in Jira.
 *
 * Preserved:
 *   - Click → navigate to `/incident-hub/view/:id` detail route.
 *   - `New Incident` CTA wired through `createLabel` / `onCreate` →
 *     `NewIncidentModal`.
 *
 * New capability (not a regression):
 *   - Basic + advanced filter popovers: Severity / Priority / SLA / Assignee.
 *   - Group-by swimlanes: Severity / Priority / Assignee.
 *   - Search, density, view settings.
 *   - Breached cards get the canonical "flag" edge affordance
 *     (`isFlagged = resolution_breached`) instead of a bespoke red
 *     border.
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import {
  buildIncidentHubBoardAdapter,
  type IncidentHubRow,
} from '@/components/kanban/adapters/incidentHubBoardAdapter';
import { useIncidentListView } from '@/hooks/useIncidentHub';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { NewIncidentModal } from './components/NewIncidentModal';

export default function IncidentKanbanPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const avatarsByName = useProfileAvatarsByName();
  const { data: incidents = [], isLoading } = useIncidentListView();

  const [showCreate, setShowCreate] = useState(false);

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

  /* ═════ Read-only drop handler. ═════ */
  const onDropAttempt = useCallback(() => {
    toast.message('Incidents are read-only in IncidentHub', {
      description: 'Production incidents are synced from Jira. Update status there.',
    });
    // Force refetch so KanbanBoardShell resets its optimistic colMap
    // when a new card identity array flows back from the query.
    qc.invalidateQueries({ queryKey: ['incident-hub-list'] });
  }, [qc]);

  /* ═════ Card click → detail route (unchanged from legacy page). ═════ */
  const onCardClick = useCallback((cardId: string) => {
    navigate(`/incident-hub/view/${cardId}`);
  }, [navigate]);

  const rows = incidents as IncidentHubRow[];

  /* ═════ Build the canonical adapter. ═════ */
  const adapter = useMemo(() => buildIncidentHubBoardAdapter({
    incidents: rows,
    avatarsByName,
    search,
    onSearchChange: setSearch,
    selAssignees,
    onSelAssigneesChange: setSelAssignees,
    filterSelected,
    onFilterChange,
    onClearFilters,
    groupBy,
    onGroupByChange: setGroupBy,
    onDropAttempt,
    onCardClick,
    onCreate: () => setShowCreate(true),
  }), [
    rows, avatarsByName,
    search, selAssignees, filterSelected, groupBy,
    onFilterChange, onClearFilters,
    onDropAttempt, onCardClick,
  ]);

  if (isLoading) {
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
      <KanbanBoardShell adapter={adapter} title="Incident Kanban" />
      <NewIncidentModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
