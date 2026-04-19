/**
 * PortfolioKanban — /portfolio-kanban
 *
 * Migrated onto the canonical KanbanBoardShell (Phase 8).
 *
 * Before: bespoke flex-grid + @hello-pangea/dnd + theme-swimlanes.
 * After : <KanbanBoardShell adapter={buildPortfolioBoardAdapter(...)}/>
 *
 * Behaviour preserved:
 *   - Five lifecycle columns: Proposed → Analyzing → Approved → In Progress → Done.
 *   - Drag epic between columns persists status change.
 *   - Strategic-theme grouping retained as a group-by dimension (was inline
 *     swimlanes); user picks theme via the toolbar's Group-by popover.
 */
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KanbanBoardShell } from '@/components/kanban/KanbanBoardShell';
import {
  buildPortfolioBoardAdapter,
  type EpicRow,
  type EpicStatus,
  type ThemeRow,
} from '@/components/kanban/adapters/portfolioBoardAdapter';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';

export default function PortfolioKanban() {
  const qc = useQueryClient();
  const avatarsByName = useProfileAvatarsByName();

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

  /* ═════ Data. ═════ */
  const { data: epics = [], isLoading: epicsLoading } = useQuery({
    queryKey: ['epics-kanban'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*, strategic_themes(name)')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as EpicRow[];
    },
  });

  const { data: themes = [], isLoading: themesLoading } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data ?? []) as ThemeRow[];
    },
  });

  /* ═════ Status mutation. ═════ */
  const updateEpicStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EpicStatus }) => {
      const { error } = await supabase
        .from('epics')
        .update({ status: status as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics-kanban'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update epic status');
    },
  });

  const onStatusChange = useCallback(
    (epicId: string, status: EpicStatus) => {
      updateEpicStatus.mutate({ id: epicId, status });
    },
    [updateEpicStatus],
  );

  /* ═════ Build the canonical adapter. ═════ */
  const adapter = useMemo(() => buildPortfolioBoardAdapter({
    epics,
    themes,
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
    epics, themes, avatarsByName,
    search, selAssignees, filterSelected, groupBy,
    onFilterChange, onClearFilters, onStatusChange,
  ]);

  if (epicsLoading || themesLoading) {
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

  return <KanbanBoardShell adapter={adapter} title="Portfolio Kanban" />;
}
