/**
 * useCreateKanbanFromFilter — service for the "Create Kanban from filter" action.
 *
 * Reuses the canonical board-creation path and the project's existing column
 * configuration instead of hand-rolling either:
 *
 *   1. create_board RPC        → inserts the board, seeds default columns +
 *                                quick filters, adds the creator to board_members
 *                                as admin (canonical; never a raw boards.insert).
 *   2. cloneBoardColumns()     → replaces the RPC's generic columns with an exact
 *                                copy of the project's primary board — board_columns
 *                                (incl. status_ids) + board_status_mappings, with
 *                                column_id remapped old→new. This is how a filter
 *                                board inherits the project's configured columns.
 *   3. boards.filter_id = …    → links the board to its source filter so the board
 *                                view (KanbanBoardPage) resolves issues from the
 *                                filter's JQL, and dedup/back-link work.
 *   4. used_by_board_ids       → back-link on the saved filter.
 *
 * RLS: board_columns insert/delete is allowed for the board's created_by (which
 * create_board sets to the creator), and board_status_mappings insert is open to
 * authenticated users — so the clone runs with the creator's own permissions,
 * no SECURITY DEFINER RPC required.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SavedFilterFull } from '@/hooks/workhub/useSavedFilters';

export interface SourceMapping {
  status_id: string;
  status_name: string;
  bucket_type: string;
  column_id: string | null;
  order_index: number;
}

/**
 * Rewrite cloned status mappings onto the new board's columns.
 * Pure + side-effect free so the id-remap logic is unit-tested in isolation.
 */
export function remapStatusMappings(
  mappings: SourceMapping[],
  oldToNewColId: Record<string, string>,
): SourceMapping[] {
  return mappings
    // keep null (unmapped) rows, and rows whose column was cloned; drop danglers
    .filter(m => m.column_id == null || oldToNewColId[m.column_id] !== undefined)
    .map(m => ({
      status_id: m.status_id,
      status_name: m.status_name,
      bucket_type: m.bucket_type,
      column_id: m.column_id == null ? null : oldToNewColId[m.column_id],
      order_index: m.order_index,
    }));
}

/**
 * Copy board_columns + board_status_mappings from a source board onto a target
 * board, replacing whatever default columns create_board seeded. Old→new column
 * ids are matched by position (unique per board), then mappings are remapped.
 */
async function cloneBoardColumns(sourceBoardId: string, targetBoardId: string): Promise<void> {
  const { data: srcCols, error: colErr } = await (supabase as any)
    .from('board_columns')
    .select('id, name, position, status_ids, is_backlog, is_done')
    .eq('board_id', sourceBoardId)
    .order('position');
  if (colErr) throw new Error(colErr.message);
  if (!srcCols?.length) return; // nothing to clone — keep create_board's defaults

  const { data: srcMaps, error: mapErr } = await (supabase as any)
    .from('board_status_mappings')
    .select('status_id, status_name, bucket_type, column_id, order_index')
    .eq('board_id', sourceBoardId)
    .order('order_index');
  if (mapErr) throw new Error(mapErr.message);

  // Drop the generic columns create_board seeded on the new board.
  const { error: delErr } = await (supabase as any)
    .from('board_columns').delete().eq('board_id', targetBoardId);
  if (delErr) throw new Error(delErr.message);

  // Insert the cloned columns and read back their new ids.
  const { data: newCols, error: insErr } = await (supabase as any)
    .from('board_columns')
    .insert(
      srcCols.map((c: any) => ({
        board_id: targetBoardId,
        name: c.name,
        position: c.position,
        status_ids: c.status_ids ?? [],
        is_backlog: c.is_backlog,
        is_done: c.is_done,
      })),
    )
    .select('id, position');
  if (insErr) throw new Error(insErr.message);

  // Map old column id → new column id by position (unique per board).
  const newByPos = new Map<number, string>((newCols ?? []).map((c: any) => [c.position, c.id]));
  const oldToNew: Record<string, string> = {};
  for (const c of srcCols as any[]) {
    const newId = newByPos.get(c.position);
    if (newId) oldToNew[c.id] = newId;
  }

  const remapped = remapStatusMappings((srcMaps ?? []) as SourceMapping[], oldToNew);
  if (remapped.length) {
    const { error: mapInsErr } = await (supabase as any)
      .from('board_status_mappings')
      .insert(remapped.map(m => ({ board_id: targetBoardId, ...m })));
    if (mapInsErr) throw new Error(mapInsErr.message);
  }
}

/**
 * Seed one board_column + one board_status_mappings row per active Jira status.
 *
 * Replaces the 3 generic columns seeded by create_board (To Do / In Progress /
 * Done) with N columns — one per distinct status that has ≥1 issue in the
 * project. Statuses with zero issues are never in ph_issues so are never seeded.
 *
 * Column order: To Do statuses → In Progress statuses → Done statuses.
 * is_backlog=true for To Do statuses, is_done=true for Done statuses.
 *
 * status_id uses crypto.randomUUID() — the FK to catalyst_workflow_statuses
 * was dropped in migration 20260612131000 because Jira status names are not a
 * subset of that table.
 */
export async function seedBoardStatusMappings(
  boardId: string,
  projectKey: string,
  sb: typeof supabase,
): Promise<void> {
  // 1. Distinct statuses for this project (only statuses with ≥1 issue appear)
  const { data: rows } = await (sb as any)
    .from('ph_issues')
    .select('status, status_category')
    .eq('project_key', projectKey.toUpperCase())
    .not('status', 'is', null);

  if (!rows?.length) return;

  // Deduplicate: first occurrence wins; preserve category for ordering
  const seen = new Map<string, string>(); // status_name → status_category
  for (const r of rows) {
    if (r.status && !seen.has(r.status)) seen.set(r.status, r.status_category ?? '');
  }

  // Sort: To Do → In Progress → Done
  const categoryOrder: Record<string, number> = { 'To Do': 0, 'In Progress': 1, 'Done': 2 };
  const sorted = Array.from(seen.entries()).sort(([, a], [, b]) => {
    return (categoryOrder[a] ?? 1) - (categoryOrder[b] ?? 1);
  });

  // 2. Replace the 3 default columns with one column per status
  await (sb as any).from('board_columns').delete().eq('board_id', boardId);

  const columnInserts = sorted.map(([statusName, statusCategory], idx) => ({
    board_id:   boardId,
    name:       statusName,
    position:   idx,
    status_ids: [],
    is_backlog: statusCategory === 'To Do',
    is_done:    statusCategory === 'Done',
  }));

  const { data: newCols } = await (sb as any)
    .from('board_columns')
    .insert(columnInserts)
    .select('id, position');

  if (!newCols?.length) return;

  // 3. 1:1 mapping: each status → its own column
  const colByPosition = new Map<number, string>(
    (newCols as any[]).map((c: any) => [c.position, c.id]),
  );

  const mappings = sorted.map(([statusName], idx) => ({
    board_id:    boardId,
    status_id:   crypto.randomUUID(),
    status_name: statusName,
    bucket_type: 'column',
    column_id:   colByPosition.get(idx) ?? null,
    order_index: idx,
  }));

  if (mappings.length) {
    await (sb as any).from('board_status_mappings').insert(mappings);
  }
}

export interface CreateKanbanFromFilterArgs {
  filter: SavedFilterFull;
  /** Jira project key (e.g. 'BAU'). Used to populate boards.jira_project_key so
   *  the board appears in the project's board switcher. NOT the legacy projects UUID. */
  projectKey: string | null;
  /** The project's primary board to clone columns from (may be null → defaults). */
  sourceBoardId: string | null;
  name: string;
  visibility: string;
}

export function useCreateKanbanFromFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ filter, projectKey, sourceBoardId, name, visibility }: CreateKanbanFromFilterArgs) => {
      // 1. Canonical board creation (board + default columns + quick filters + admin member).
      //    p_project_id is always null for filter boards — filter boards are not tied to the
      //    legacy `projects` table (only to `ph_projects` via jira_project_key set in step 3).
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      const { data: newBoardId, error: rpcErr } = await (supabase as any).rpc('create_board', {
        p_name: name,
        p_project_id: null,
        p_visibility: visibility,
        p_user_id: uid,
        p_board_type: 'kanban',
        p_board_query: filter.jql_query ?? null,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      const boardId = newBoardId as string;

      // 2. Inherit the project's configured columns.
      if (sourceBoardId) await cloneBoardColumns(sourceBoardId, boardId);

      // 3. Link the board to its source filter and project key.
      //    filter_id → drives issue source (KanbanBoardPage resolves JQL from this).
      //    jira_project_key → makes the board appear in the project's board switcher.
      const { error: linkErr } = await (supabase as any)
        .from('boards')
        .update({ filter_id: filter.id, jira_project_key: projectKey ? projectKey.toUpperCase() : null })
        .eq('id', boardId);
      if (linkErr) throw new Error(linkErr.message);

      // 4. Seed status mappings so all project statuses route to the correct column.
      if (projectKey) await seedBoardStatusMappings(boardId, projectKey, supabase);

      // 6. Back-link on the saved filter.
      const nextBoardIds = [...(filter.used_by_board_ids ?? []), boardId];
      await (supabase as any)
        .from('ph_saved_filters').update({ used_by_board_ids: nextBoardIds }).eq('id', filter.id);

      return boardId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['filters'] });
      qc.invalidateQueries({ queryKey: ['boards'] });
      qc.invalidateQueries({ queryKey: ['project-boards'] });
      qc.invalidateQueries({ queryKey: ['project-boards-native'] });
      qc.invalidateQueries({ queryKey: ['project-boards-filter'] });
      qc.invalidateQueries({ queryKey: ['existing-board-for-filter'] });
    },
  });
}
