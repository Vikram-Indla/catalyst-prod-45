/**
 * Service Functions — ProjectHub SDLC Views
 * Board, List, Backlog data access layer
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  WorkItemFull,
  BoardColumn,
  BoardColumnWithCounts,
  ListConfig,
  BacklogConfig,
  ViewFilterState,
  ItemDetailUpdate,
  SortDirection,
} from '@/types/views';

// ═══════════════════════════════════════════════════════════
// Work Items (core — used by ALL 3 views)
// ═══════════════════════════════════════════════════════════

export async function fetchWorkItems(
  projectId: string,
  releaseIds: string[],
  filters: ViewFilterState,
  sort: { column: string; direction: SortDirection },
  pagination: { page: number; perPage: number },
  includeSubtasks: boolean,
  currentUserId?: string
): Promise<{ items: WorkItemFull[]; total: number }> {
  let query = supabase
    .from('ph_work_items_full_view')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId);

  if (releaseIds.length > 0) {
    query = query.in('release_id', releaseIds);
  }

  if (!includeSubtasks) {
    query = query.is('parent_id', null);
  }

  // Apply filters
  if (filters.statuses.length > 0) query = query.in('status', filters.statuses);
  if (filters.types.length > 0) query = query.in('item_type', filters.types);
  if (filters.priorities.length > 0) query = query.in('priority', filters.priorities);
  if (filters.assigneeIds.length > 0) query = query.in('assignee_id', filters.assigneeIds);
  if (filters.searchQuery) {
    query = query.or(`title.ilike.%${filters.searchQuery}%,item_key.ilike.%${filters.searchQuery}%`);
  }

  // Quick filters
  if (filters.quickFilters.includes('my_items') && currentUserId) {
    query = query.eq('assignee_id', currentUserId);
  }
  if (filters.quickFilters.includes('bugs')) {
    query = query.eq('item_type', 'Bug');
  }
  if (filters.quickFilters.includes('unassigned')) {
    query = query.is('assignee_id', null);
  }
  if (filters.quickFilters.includes('overdue')) {
    query = query.eq('is_overdue', true);
  }
  if (filters.quickFilters.includes('on_hold')) {
    query = query.eq('status', 'on_hold');
  }

  // Sort
  query = query.order(sort.column, { ascending: sort.direction === 'asc' });

  // Paginate
  const from = (pagination.page - 1) * pagination.perPage;
  query = query.range(from, from + pagination.perPage - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  return { items: (data as unknown as WorkItemFull[]) ?? [], total: count ?? 0 };
}

export async function fetchWorkItem(itemId: string): Promise<WorkItemFull> {
  const { data, error } = await supabase
    .from('ph_work_items_full_view')
    .select('*')
    .eq('id', itemId)
    .single();
  if (error) throw error;
  return data as unknown as WorkItemFull;
}

export async function fetchSubIssues(parentId: string): Promise<WorkItemFull[]> {
  const { data, error } = await supabase
    .from('ph_work_items_full_view')
    .select('*')
    .eq('parent_id', parentId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as unknown as WorkItemFull[]) ?? [];
}

// ═══════════════════════════════════════════════════════════
// Mutations
// ═══════════════════════════════════════════════════════════

export async function updateWorkItem(itemId: string, updates: ItemDetailUpdate): Promise<void> {
  const { error } = await supabase
    .from('ph_work_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw error;
}

export async function updateWorkItemStatus(
  itemId: string,
  fromStatus: string,
  toStatus: string,
  changedBy: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from('ph_work_items')
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (updateError) throw updateError;

  await supabase
    .from('ph_status_transitions')
    .insert({
      work_item_id: itemId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: changedBy,
      changed_at: new Date().toISOString(),
    });
}

export async function bulkUpdateWorkItems(
  itemIds: string[],
  updates: Partial<ItemDetailUpdate>
): Promise<void> {
  const { error } = await supabase
    .from('ph_work_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .in('id', itemIds);
  if (error) throw error;
}

export async function createWorkItem(item: {
  title: string;
  item_type: string;
  status: string;
  priority: string;
  release_id: string;
  project_id: string;
  assignee_id?: string;
  parent_id?: string;
  due_date?: string;
  description?: string;
  reporter_id?: string;
}): Promise<WorkItemFull> {
  // Generate next key
  const { data: project } = await supabase
    .from('projects')
    .select('key')
    .eq('id', item.project_id)
    .single();

  const projectKey = project?.key ?? 'WI';

  const { data: maxItem } = await supabase
    .from('ph_work_items')
    .select('item_key')
    .eq('project_id', item.project_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const nextNum = maxItem ? parseInt(maxItem.item_key.split('-')[1]) + 1 : 1;
  const newKey = `${projectKey}-${nextNum}`;

  // Get max sort_order
  const { data: maxSort } = await supabase
    .from('ph_work_items')
    .select('sort_order')
    .eq('project_id', item.project_id)
    .eq('status', item.status)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const newSortOrder = (maxSort?.sort_order ?? 0) + 1000;

  const insertPayload = {
    item_key: newKey,
    title: item.title,
    item_type: item.item_type,
    status: item.status,
    priority: item.priority,
    release_id: item.release_id,
    project_id: item.project_id,
    assignee_id: item.assignee_id ?? null,
    parent_id: item.parent_id ?? null,
    due_date: item.due_date ?? null,
    description: item.description ?? null,
    sort_order: newSortOrder,
    reporter_id: item.reporter_id ?? null,
  } as any;

  const { data, error } = await supabase
    .from('ph_work_items')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as WorkItemFull;
}

export async function deleteWorkItems(itemIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('ph_work_items')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', itemIds);
  if (error) throw error;
}

export async function reorderWorkItems(
  items: { id: string; sortOrder: number }[]
): Promise<void> {
  for (const item of items) {
    await supabase
      .from('ph_work_items')
      .update({ sort_order: item.sortOrder })
      .eq('id', item.id);
  }
}

// ═══════════════════════════════════════════════════════════
// Board Config
// ═══════════════════════════════════════════════════════════

export async function fetchBoardConfig(projectId: string): Promise<BoardColumn[]> {
  const { data, error } = await supabase
    .from('ph_board_config')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_visible', true)
    .order('column_order', { ascending: true });
  if (error) throw error;
  return (data as unknown as BoardColumn[]) ?? [];
}

export async function fetchBoardColumnCounts(projectId: string): Promise<BoardColumnWithCounts[]> {
  const { data, error } = await supabase
    .from('ph_board_column_counts_view')
    .select('*')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data as unknown as BoardColumnWithCounts[]) ?? [];
}

export async function updateBoardWipLimit(configId: string, wipLimit: number | null): Promise<void> {
  const { error } = await supabase
    .from('ph_board_config')
    .update({ wip_limit: wipLimit })
    .eq('id', configId);
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════
// List Config
// ═══════════════════════════════════════════════════════════

export async function fetchListConfig(projectId: string, userId: string): Promise<ListConfig | null> {
  const { data, error } = await supabase
    .from('ph_list_config')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ListConfig | null;
}

export async function upsertListConfig(
  config: Partial<ListConfig> & { project_id: string; user_id: string }
): Promise<void> {
  const { error } = await supabase
    .from('ph_list_config')
    .upsert(config, { onConflict: 'project_id,user_id' });
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════
// Backlog Config
// ═══════════════════════════════════════════════════════════

export async function fetchBacklogConfig(projectId: string, userId: string): Promise<BacklogConfig | null> {
  const { data, error } = await supabase
    .from('ph_backlog_config')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as BacklogConfig | null;
}

export async function upsertBacklogConfig(
  config: Partial<BacklogConfig> & { project_id: string; user_id: string }
): Promise<void> {
  const { error } = await supabase
    .from('ph_backlog_config')
    .upsert(config, { onConflict: 'project_id,user_id' });
  if (error) throw error;
}
