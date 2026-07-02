/**
 * SprintsTable (CAT-SPRINTS-NATIVE-20260702-002 S1.1a).
 *
 * JiraTable-composed sprint list — replaces ReleasesTable for the sprint
 * surface only (ReleasesTable untouched, releases keep it). Columns per the
 * council list spec §10: Sprint (name + 1W/2W lozenge) · Status (native
 * vocabulary pill) · Progress · Start date · Sprint end (overdue in danger
 * text) · Release (S1.4 fills it) · Owner (creator avatar) · ⋯.
 *
 * JiraTable is the 3,197-line shared canonical — consumed only, never edited.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import type { RowGroup } from '@/components/shared/JiraTable/types';
import type { Density } from '@/components/shared/JiraTable/types';
import {
  type SprintRow,
  type SprintProgress,
  type SprintRowActions,
  makeSprintNameCell,
  makeSprintStatusCell,
  makeSprintProgressCell,
  makeSprintStartDateCell,
  makeSprintEndCell,
  makeSprintReleaseCell,
  makeSprintOwnerCell,
  makeSprintActionsCell,
} from './cells';

interface SprintsTableProps {
  rows?: SprintRow[];
  groups?: RowGroup<SprintRow>[];
  getProgress: (row: SprintRow) => SprintProgress | null;
  onOpenDetail: (row: SprintRow) => void;
  actions: SprintRowActions;
  collapsedGroups?: ReadonlySet<string>;
  onToggleGroup?: (groupId: string) => void;
  density?: Density;
  isLoading?: boolean;
}

export function SprintsTable({
  rows,
  groups,
  getProgress,
  onOpenDetail,
  actions,
  collapsedGroups,
  onToggleGroup,
  density = 'comfortable',
  isLoading,
}: SprintsTableProps) {
  // Owner resolution: batch-load the profiles referenced by created_by.
  const creatorIds = useMemo(() => {
    const all = groups ? groups.flatMap((g) => g.rows) : rows ?? [];
    return [...new Set(all.map((r) => r.created_by).filter(Boolean))] as string[];
  }, [rows, groups]);

  const { data: ownerProfiles } = useQuery({
    queryKey: ['sprint-owner-profiles', creatorIds.slice().sort().join('|')],
    queryFn: async () => {
      if (creatorIds.length === 0) return new Map<string, { name: string | null; avatarUrl: string | null }>();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', creatorIds);
      if (error) throw new Error(error.message);
      const m = new Map<string, { name: string | null; avatarUrl: string | null }>();
      (data ?? []).forEach((p: any) => m.set(p.id, { name: p.full_name, avatarUrl: p.avatar_url }));
      return m;
    },
    enabled: creatorIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const columns = useMemo(
    () => [
      makeSprintNameCell(onOpenDetail),
      makeSprintStatusCell(),
      makeSprintProgressCell(getProgress),
      makeSprintStartDateCell(),
      makeSprintEndCell(),
      makeSprintReleaseCell(),
      makeSprintOwnerCell((row) =>
        row.created_by ? ownerProfiles?.get(row.created_by) ?? null : null,
      ),
      makeSprintActionsCell(actions),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onOpenDetail, getProgress, ownerProfiles, actions],
  );

  return (
    <JiraTable<SprintRow>
      columns={columns}
      data={groups ? undefined : rows}
      groups={groups}
      getRowId={(r) => r.id}
      onRowClick={onOpenDetail}
      collapsedGroups={collapsedGroups}
      onToggleGroup={onToggleGroup}
      density={density}
      isLoading={isLoading}
      showRowCount={false}
      ariaLabel="Sprints"
      emptyView={
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ds-text-subtlest)' }}>
          No sprints match this filter.
        </div>
      }
    />
  );
}
