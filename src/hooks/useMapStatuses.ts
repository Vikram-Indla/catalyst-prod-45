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
  slug: string; // kept for interface compat; always '' from ph_workflow_statuses
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

export function useMapStatuses(projectKey: string | undefined, boardId?: string) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const initialRef = useRef<DraftState | null>(null);

  // project ID only needed when no boardId is provided (fallback path)
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
    enabled: !!projectKey && !boardId,
    staleTime: 300_000,
  });

  // 2. Get all workflow statuses from ph_workflow_statuses (non-archived)
  const { data: allStatuses } = useQuery({
    queryKey: ['all-workflow-statuses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_workflow_statuses')
        .select('id, name, category, color, position, ph_workflow_type_statuses(work_item_type)')
        .is('archived_at', null)
        .order('position');
      if (!data) return [];
      // Deduplicate by name across types
      const seen = new Map<string, WorkflowStatus>();
      for (const s of data) {
        if (!seen.has(s.name)) {
          const typeRow = (s.ph_workflow_type_statuses as any[])?.[0];
          seen.set(s.name, {
            id: s.id,
            name: s.name,
            slug: '',
            category: s.category,
            color: s.color ?? '',
            position: s.position,
            issueType: typeRow?.work_item_type ?? '',
          });
        }
      }
      return Array.from(seen.values());
    },
    staleTime: 300_000,
  });

  // 3. Get board + columns — use boardId from URL directly when available
  const resolvedBoardId = boardId ?? null;
  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ['board-columns-for-map', resolvedBoardId ?? projectId],
    queryFn: async () => {
      // Path A: boardId supplied via URL (always prefer this)
      if (resolvedBoardId) {
        const [{ data: cols }, { data: mappings }] = await Promise.all([
          supabase
            .from('board_columns')
            .select('id, name, position, status_ids, is_backlog, is_done')
            .eq('board_id', resolvedBoardId)
            .order('position'),
          supabase
            .from('board_status_mappings')
            .select('*')
            .eq('board_id', resolvedBoardId)
            .order('order_index'),
        ]);
        return { boardId: resolvedBoardId, columns: cols ?? [], mappings: mappings ?? [] };
      }

      // Path B: fallback — find board by project_id (legacy, only when no boardId in URL)
      if (!projectId) return { boardId: null, columns: [], mappings: [] };
      const { data: boards } = await supabase
        .from('boards')
        .select('id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .limit(1);
      const foundBoardId = boards?.[0]?.id ?? null;
      if (!foundBoardId) return { boardId: null, columns: [], mappings: [] };

      const [{ data: cols }, { data: mappings }] = await Promise.all([
        supabase
          .from('board_columns')
          .select('id, name, position, status_ids, is_backlog, is_done')
          .eq('board_id', foundBoardId)
          .order('position'),
        supabase
          .from('board_status_mappings')
          .select('*')
          .eq('board_id', foundBoardId)
          .order('order_index'),
      ]);
      return { boardId: foundBoardId, columns: cols ?? [], mappings: mappings ?? [] };
    },
    enabled: !!(resolvedBoardId || projectId),
    staleTime: 60_000,
  });

  // 4. Get issue counts per status for this project (from ph_issues which uses project_key)
  const { data: statusCounts } = useQuery({
    queryKey: ['status-counts-for-map', projectKey],
    queryFn: async () => {
      if (!projectKey) return [];
      // ph_issues can have many rows — fetch in pages to avoid the 1000-row limit
      const counts = new Map<string, number>();
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from('ph_issues')
          .select('status')
          .eq('project_key', projectKey)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        for (const row of data) {
          const s = (row as any).status as string;
          if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
    },
    enabled: !!projectKey,
    staleTime: 60_000,
  });

  const countsMap = useMemo(() => {
    const m = new Map<string, number>();
    statusCounts?.forEach(sc => m.set(sc.status, sc.count));
    return m;
  }, [statusCounts]);

  // 5. Initialize draft from DB or hardcoded defaults
  useEffect(() => {
    if (!allStatuses?.length || boardLoading) return;
    if (draft) return; // Already initialized

    const { columns: dbCols, mappings: dbMappings } = boardData ?? { columns: [], mappings: [] };

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
  }, [allStatuses, boardData, boardLoading, draft]);

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
    if (!draft) return;
    // When boardId is supplied via URL, we don't need projectId (board already exists)
    const resolvedExistingBoardId = boardData?.boardId ?? resolvedBoardId;
    if (!resolvedExistingBoardId && !projectId) return;
    setSaving(true);
    setSaveError(null);

    try {
      let boardId = boardData?.boardId ?? resolvedBoardId ?? null;

      // Create board on-the-fly if none exists (only when no boardId from URL or DB)
      if (!boardId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data: newBoard, error: boardErr } = await supabase
          .from('boards')
          .insert({
            name: `${projectKey ?? 'Project'} Board`,
            project_id: projectId,
            created_by: user.id,
            board_type: 'kanban',
            visibility: 'project',
          })
          .select('id')
          .single();
        if (boardErr || !newBoard) throw new Error(boardErr?.message ?? 'Failed to create board');
        boardId = newBoard.id;
      }

      const activeCols = draft.columns.filter(c => !c.isDeleted);
      const deletedCols = draft.columns.filter(c => c.isDeleted && !c.isNew);
      const newCols = activeCols.filter(c => c.isNew);
      const existingCols = activeCols.filter(c => !c.isNew);

      // Round-trip 1 (parallel): delete removed columns + bulk-insert new columns
      const colIdMap = new Map<string, string>();
      await Promise.all([
        // Delete all removed columns in one IN query
        deletedCols.length > 0
          ? supabase.from('board_columns').delete().in('id', deletedCols.map(c => c.id))
          : Promise.resolve(),
        // Bulk-insert new columns and map temp-id → real-id
        newCols.length > 0
          ? supabase
              .from('board_columns')
              .insert(newCols.map(col => ({
                board_id: boardId,
                name: col.name,
                position: col.position,
                status_ids: [],
                is_backlog: false,
                is_done: false,
              })))
              .select('id, name')
              .then(({ data }) => {
                // Match returned rows back to temp cols by insertion order
                data?.forEach((row, i) => colIdMap.set(newCols[i].id, row.id));
              })
          : Promise.resolve(),
      ]);

      // Build status_ids per column (must happen after colIdMap is populated)
      const colStatusIds = new Map<string, string[]>();
      for (const m of draft.mappings) {
        if (m.bucketType === 'column' && m.columnId) {
          const realColId = colIdMap.get(m.columnId) ?? m.columnId;
          if (!colStatusIds.has(realColId)) colStatusIds.set(realColId, []);
          colStatusIds.get(realColId)!.push(m.statusId);
        }
      }

      // Round-trip 2 (parallel): update existing columns + replace board_status_mappings
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

      await Promise.all([
        // Upsert all active columns (name + position + status_ids) in one bulk call
        activeCols.length > 0
          ? supabase.from('board_columns').upsert(
              activeCols.map(col => {
                const realId = colIdMap.get(col.id) ?? col.id;
                return {
                  id: realId,
                  board_id: boardId,
                  name: col.name,
                  position: col.position,
                  status_ids: colStatusIds.get(realId) ?? [],
                  is_backlog: false,
                  is_done: false,
                };
              }),
              { onConflict: 'id' }
            )
          : Promise.resolve(),
        // Delete-then-insert board_status_mappings (must be serial, but run alongside column upsert)
        supabase
          .from('board_status_mappings')
          .delete()
          .eq('board_id', boardId)
          .then(() =>
            mappingRows.length > 0
              ? supabase.from('board_status_mappings').insert(mappingRows)
              : Promise.resolve()
          ),
      ]);

      // Invalidate kanban queries so board refreshes — key must match KanbanBoardPage
      qc.invalidateQueries({ queryKey: ['board-columns-for-map'] });
      qc.invalidateQueries({ queryKey: ['kanban-board-columns', boardId] });
      qc.invalidateQueries({ queryKey: ['kanban-issues'] });

      // Build the post-save draft in one place so initialRef and state are identical
      const savedDraft: DraftState = {
        columns: draft.columns
          .filter(c => !c.isDeleted)
          .map(c => ({ ...c, id: colIdMap.get(c.id) ?? c.id, isNew: false })),
        mappings: draft.mappings.map(m => ({
          ...m,
          columnId: m.columnId ? (colIdMap.get(m.columnId) ?? m.columnId) : null,
        })),
      };
      initialRef.current = JSON.parse(JSON.stringify(savedDraft));
      setDraft(savedDraft);
    } catch (err: any) {
      setSaveError(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [draft, boardData, projectId, projectKey, qc]);

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
