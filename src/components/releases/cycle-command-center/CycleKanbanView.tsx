/**
 * Cycle Kanban View — test-execution kanban inside the Cycle Command Centre.
 *
 * Migrated onto the canonical KanbanBoardShell (Phase 8).
 *
 * Before: bespoke 5-column grid + @dnd-kit, custom card surface.
 * After : <KanbanBoardShell adapter={buildCycleBoardAdapter(...)}/>
 *
 * DATA SOURCE: useCycleExecutionItems (shared hook) — status from
 * tm_cycle_scope.current_status remains the source of truth. Drop persists
 * through useUpdateExecutionStatus, which auto-creates a tm_test_runs row
 * when the destination is a terminal status (passed / failed / blocked /
 * skipped).
 */
import { useCallback, useMemo, useState } from 'react';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import {
  buildCycleBoardAdapter,
  TERMINAL_STATUSES,
} from '@/components/kanban/adapters/cycleBoardAdapter';
import { useCycleExecutionItems } from '@/hooks/test-cycles/useCycleExecutionItems';
import { useUpdateExecutionStatus } from '@/hooks/test-cycles/useExecutionMutations';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import type { UIStatus } from '@/hooks/test-cycles/useCycleExecutionItems';

interface CycleKanbanViewProps {
  cycleId: string;
}

export function CycleKanbanView({ cycleId }: CycleKanbanViewProps) {
  const avatarsByName = useProfileAvatarsByName();
  const { items, isLoading } = useCycleExecutionItems(cycleId);
  const updateStatus = useUpdateExecutionStatus(cycleId);

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

  /* ═════ Persistence. ═════ */
  const onStatusChange = useCallback(
    (scopeId: string, status: UIStatus) => {
      updateStatus.mutate({
        scopeId,
        status,
        createRun: TERMINAL_STATUSES.includes(status),
      });
    },
    [updateStatus],
  );

  const adapter = useMemo(() => buildCycleBoardAdapter({
    items,
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
    onStatusChange,
  }), [
    items, avatarsByName,
    search, selAssignees, filterSelected, groupBy,
    onFilterChange, onClearFilters, onStatusChange,
  ]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid #2563EB', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  return <KanbanBoardShell adapter={adapter} title="Test Execution Kanban" />;
}
