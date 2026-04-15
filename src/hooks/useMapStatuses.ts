/**
 * useMapStatuses — Draft state management for Map Statuses page
 * Fetches workflow statuses, board columns, and existing mappings.
 * Returns a mutable draft and save/cancel functions.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ── Types ── */

export interface WorkflowStatus {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string;
  position: number;
  issueType: string;
}

export interface DraftColumn {
  id: string;          // uuid from board_columns or temp- for new
  name: string;
  position: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

export interface DraftMapping {
  statusId: string;
  statusName: string;
  bucketType: 'column' | 'backlog' | 'unmapped';
  columnId: string | null;
  orderIndex: number;
}

export interface DraftState {
  columns: DraftColumn[];
  mappings: DraftMapping[];
}

export interface StatusCount {
  status: string;
  count: number;
}

export function useMapStatuses(projectKey: string | undefined) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const initialRef = useRef<DraftState | null>(null);

  // 1. Get project ID
  const { data: projectId } = useQuery({
    queryKey: ['project-id-for-map', projectKey],
    queryFn: async () => {
      if (!projectKey) return null;
      const { data } = await supabase
        .from('projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!projectKey,
    staleTime: 300_000,
  });

  // 2. Get all workflow statuses from all active schemes
  const { data: allStatuses } = useQuery({
    queryKey: ['all-workflow-statuses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('catalyst_workflow_statuses')
        .select('id, name, slug, category, color, position, scheme_id, catalyst_workflow_schemes!inner(issue_type, is_active)')
        .eq('catalyst_workflow_schemes.is_active', true)
        .order('position');
      if (!data) return [];
      // Deduplicate by name (same status name across schemes)
      const seen = new Map<string, WorkflowStatus>();
      for (const s of data) {
        const scheme = s.catalyst_workflow_schemes as any;
        if (!seen.has(s.name)) {
          seen.set(s.name, {
            id: s.id,
            name: s.name,
            slug: s.slug,
            category: s.category,
            color: s.color,
            position: s.position,
            issueType: scheme?.issue_type ?? '',
          });
        }
      }
      return Array.from(seen.values());
    },
    staleTime: 300_000,
  });

  // 3. Get board + columns for this project (do NOT auto-create — RLS may block inserts)
  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ['board-columns-for-map', projectId],
    queryFn: async () => {
      if (!projectId) return { boardId: null, columns: [], mappings: [] };
      // Find the board for this project
      const { data: boards } = await supabase
        .from('boards')
        .select('id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .limit(1);
      const boardId = boards?.[0]?.id ?? null;

      if (!boardId) {
        return { boardId: null, columns: [], mappings: [] };
      }

      // Get columns
      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, name, position, status_ids, is_backlog, is_done')
        .eq('board_id', boardId)
        .order('position');
      // Get existing mappings
      const { data: mappings } = await supabase
        .from('board_status_mappings')
        .select('*')
        .eq('board_id', boardId)
        .order('order_index');
      return { boardId, columns: cols ?? [], mappings: mappings ?? [] };
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  // 4. Get issue counts per status for this project
  const { data: statusCounts } = useQuery({
    queryKey: ['status-counts-for-map', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from('catalyst_issues')
        .select('status')
        .eq('project_id', projectId);
      if (!data) return [];
      const counts = new Map<string, number>();
      for (const row of data) {
        const s = row.status;
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const countsMap = useMemo(() => {
    const m = new Map<string, number>();
    statusCounts?.forEach(sc => m.set(sc.status, sc.count));
    return m;
  }, [statusCounts]);

  // 5. Initialize draft from DB or hardcoded defaults
  useEffect(() => {
    if (!allStatuses?.length || !boardData) return;
    if (draft) return; // Already initialized

    const { columns: dbCols, mappings: dbMappings } = boardData;

    // If we have persisted mappings, use them
    if (dbMappings.length > 0) {
      const draftCols: DraftColumn[] = dbCols.map(c => ({
        id: c.id,
        name: c.name,
        position: c.position,
      }));
      const draftMappings: DraftMapping[] = dbMappings.map((m: any) => ({
        statusId: m.status_id,
        statusName: m.status_name,
        bucketType: m.bucket_type,
        columnId: m.column_id,
        orderIndex: m.order_index,
      }));
      // Ensure all statuses are present
      const mappedIds = new Set(draftMappings.map(m => m.statusId));
      for (const s of allStatuses) {
        if (!mappedIds.has(s.id)) {
          draftMappings.push({
            statusId: s.id,
            statusName: s.name,
            bucketType: 'unmapped',
            columnId: null,
            orderIndex: 999,
          });
        }
      }
      const state = { columns: draftCols, mappings: draftMappings };
      setDraft(state);
      initialRef.current = JSON.parse(JSON.stringify(state));
      return;
    }

    // No mappings yet — build from hardcoded KANBAN_COLUMNS defaults
    const KANBAN_DEFAULTS: { name: string; statuses: string[]; category: string }[] = [
      { name: 'IN REQUIREMENTS', category: 'todo', statuses: ['In Requirements', 'In Design', 'Awaiting Info'] },
      { name: 'READY FOR DEV', category: 'todo', statuses: ['Ready for Development', 'Backlog', 'ToDo', 'To Do'] },
      { name: 'IN DEVELOPMENT', category: 'in_progress', statuses: ['In Development', 'In Progress', 'Under Implementation'] },
      { name: 'IN TESTING', category: 'in_progress', statuses: ['In QA', 'Ready for QA', 'Retest', 'Internal QA', 'Staging/QA', 'In Testing'] },
      { name: 'IN UAT', category: 'in_progress', statuses: ['In UAT', 'UAT Ready', 'BETA READY', 'In BETA', 'In Integration'] },
      { name: 'DONE', category: 'done', statuses: ['Done', 'Closed', 'Resolved', 'In Production', 'ready for production', 'Rejected', 'Re-Open', 'Blocked'] },
    ];

    // Use existing DB columns or create from defaults
    let draftCols: DraftColumn[];
    if (dbCols.length > 0) {
      draftCols = dbCols.map(c => ({ id: c.id, name: c.name, position: c.position }));
    } else {
      draftCols = KANBAN_DEFAULTS.map((def, i) => ({
        id: `temp-${i}`,
        name: def.name,
        position: i,
        isNew: true,
      }));
    }

    // Map statuses to columns by name matching
    const statusNameLower = new Map(allStatuses.map(s => [s.name.toLowerCase(), s]));
    const draftMappings: DraftMapping[] = [];
    const mappedIds = new Set<string>();

    // For each column, find matching statuses
    if (dbCols.length > 0) {
      // Use status_ids from db columns
      for (const col of dbCols) {
        (col.status_ids ?? []).forEach((sid: string, idx: number) => {
          const status = allStatuses.find(s => s.id === sid);
          if (status) {
            draftMappings.push({
              statusId: status.id,
              statusName: status.name,
              bucketType: col.is_backlog ? 'backlog' : 'column',
              columnId: col.is_backlog ? null : col.id,
              orderIndex: idx,
            });
            mappedIds.add(status.id);
          }
        });
      }
    } else {
      // Use defaults
      KANBAN_DEFAULTS.forEach((def, colIdx) => {
        def.statuses.forEach((sName, idx) => {
          const status = statusNameLower.get(sName.toLowerCase());
          if (status && !mappedIds.has(status.id)) {
            draftMappings.push({
              statusId: status.id,
              statusName: status.name,
              bucketType: 'column',
              columnId: draftCols[colIdx].id,
              orderIndex: idx,
            });
            mappedIds.add(status.id);
          }
        });
      });
    }

    // Remaining statuses go to unmapped
    for (const s of allStatuses) {
      if (!mappedIds.has(s.id)) {
        draftMappings.push({
          statusId: s.id,
          statusName: s.name,
          bucketType: 'unmapped',
          columnId: null,
          orderIndex: 999,
        });
      }
    }

    const state = { columns: draftCols, mappings: draftMappings };
    setDraft(state);
    initialRef.current = JSON.parse(JSON.stringify(state));
  }, [allStatuses, boardData, draft]);

  // ── Draft mutation helpers ──

  const moveStatus = useCallback((statusId: string, toBucket: 'column' | 'backlog' | 'unmapped', toColumnId: string | null, toIndex?: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const mappings = prev.mappings.map(m => {
        if (m.statusId === statusId) {
          return { ...m, bucketType: toBucket, columnId: toColumnId, orderIndex: toIndex ?? 0 };
        }
        return m;
      });
      return { ...prev, mappings };
    });
  }, []);

  const reorderColumns = useCallback((fromIdx: number, toIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const cols = [...prev.columns.filter(c => !c.isDeleted)];
      const [moved] = cols.splice(fromIdx, 1);
      cols.splice(toIdx, 0, moved);
      const reindexed = cols.map((c, i) => ({ ...c, position: i }));
      // Also include deleted columns
      const deleted = prev.columns.filter(c => c.isDeleted);
      return { ...prev, columns: [...reindexed, ...deleted] };
    });
  }, []);

  const addColumn = useCallback((name: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const activeCols = prev.columns.filter(c => !c.isDeleted);
      const newCol: DraftColumn = {
        id: `temp-${Date.now()}`,
        name,
        position: activeCols.length,
        isNew: true,
      };
      return { ...prev, columns: [...prev.columns, newCol] };
    });
  }, []);

  const renameColumn = useCallback((colId: string, newName: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map(c => c.id === colId ? { ...c, name: newName } : c),
      };
    });
  }, []);

  const deleteColumn = useCallback((colId: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      // Move statuses from this column to unmapped
      const mappings = prev.mappings.map(m => {
        if (m.columnId === colId) {
          return { ...m, bucketType: 'unmapped' as const, columnId: null, orderIndex: 999 };
        }
        return m;
      });
      // Mark column as deleted (or remove if new)
      const columns = prev.columns
        .filter(c => !(c.id === colId && c.isNew))
        .map(c => c.id === colId ? { ...c, isDeleted: true } : c);
      return { columns, mappings };
    });
  }, []);

  // ── Check for unsaved changes ──
  const hasChanges = useMemo(() => {
    if (!draft || !initialRef.current) return false;
    return JSON.stringify(draft) !== JSON.stringify(initialRef.current);
  }, [draft]);

  // ── Save ──
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (!draft || !boardData?.boardId) return;
    setSaving(true);
    setSaveError(null);

    try {
      const boardId = boardData.boardId;
      const activeCols = draft.columns.filter(c => !c.isDeleted);

      // 1. Delete removed columns
      const deletedCols = draft.columns.filter(c => c.isDeleted && !c.isNew);
      for (const col of deletedCols) {
        await supabase.from('board_columns').delete().eq('id', col.id);
      }

      // 2. Create new columns
      const newCols = activeCols.filter(c => c.isNew);
      const colIdMap = new Map<string, string>(); // temp-id -> real-id
      for (const col of newCols) {
        const { data } = await supabase
          .from('board_columns')
          .insert({
            board_id: boardId,
            name: col.name,
            position: col.position,
            status_ids: [],
            is_backlog: false,
            is_done: false,
          })
          .select('id')
          .single();
        if (data) colIdMap.set(col.id, data.id);
      }

      // 3. Update existing columns (name + position)
      const existingCols = activeCols.filter(c => !c.isNew);
      for (const col of existingCols) {
        await supabase
          .from('board_columns')
          .update({ name: col.name, position: col.position })
          .eq('id', col.id);
      }

      // 4. Build status_ids per column from mappings
      const colStatusIds = new Map<string, string[]>();
      for (const m of draft.mappings) {
        if (m.bucketType === 'column' && m.columnId) {
          const realColId = colIdMap.get(m.columnId) ?? m.columnId;
          if (!colStatusIds.has(realColId)) colStatusIds.set(realColId, []);
          colStatusIds.get(realColId)!.push(m.statusId);
        }
      }
      // Update each column's status_ids
      for (const [colId, sids] of colStatusIds) {
        await supabase
          .from('board_columns')
          .update({ status_ids: sids })
          .eq('id', colId);
      }
      // Clear status_ids for columns with no mappings
      for (const col of activeCols) {
        const realId = colIdMap.get(col.id) ?? col.id;
        if (!colStatusIds.has(realId)) {
          await supabase
            .from('board_columns')
            .update({ status_ids: [] })
            .eq('id', realId);
        }
      }

      // 5. Persist board_status_mappings — delete all and re-insert
      await supabase
        .from('board_status_mappings')
        .delete()
        .eq('board_id', boardId);

      const mappingRows = draft.mappings.map((m, i) => ({
        board_id: boardId,
        status_id: m.statusId,
        status_name: m.statusName,
        bucket_type: m.bucketType,
        column_id: m.bucketType === 'column' && m.columnId
          ? (colIdMap.get(m.columnId) ?? m.columnId)
          : null,
        order_index: i,
      }));

      if (mappingRows.length > 0) {
        await supabase
          .from('board_status_mappings')
          .insert(mappingRows);
      }

      // 6. Invalidate kanban queries so board refreshes
      qc.invalidateQueries({ queryKey: ['board-columns-for-map'] });
      qc.invalidateQueries({ queryKey: ['kanban-board'] });
      qc.invalidateQueries({ queryKey: ['kanban'] });

      // Update initial ref to current draft
      initialRef.current = JSON.parse(JSON.stringify(draft));
      // Update draft with real IDs
      setDraft(prev => {
        if (!prev) return prev;
        return {
          columns: prev.columns
            .filter(c => !c.isDeleted)
            .map(c => ({
              ...c,
              id: colIdMap.get(c.id) ?? c.id,
              isNew: false,
            })),
          mappings: prev.mappings.map(m => ({
            ...m,
            columnId: m.columnId ? (colIdMap.get(m.columnId) ?? m.columnId) : null,
          })),
        };
      });
    } catch (err: any) {
      setSaveError(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [draft, boardData, qc]);

  const cancel = useCallback(() => {
    if (initialRef.current) {
      setDraft(JSON.parse(JSON.stringify(initialRef.current)));
    }
  }, []);

  return {
    draft,
    allStatuses: allStatuses ?? [],
    countsMap,
    boardId: boardData?.boardId ?? null,
    loading: !draft,
    saving,
    saveError,
    hasChanges,
    moveStatus,
    reorderColumns,
    addColumn,
    renameColumn,
    deleteColumn,
    save,
    cancel,
  };
}
