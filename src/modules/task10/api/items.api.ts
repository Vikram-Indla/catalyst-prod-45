// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ ITEMS API
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { T10ItemRow, T10ItemWithAssignee, T10ItemInsert, T10ItemStatus } from '../types';
import type { Database, Json } from '@/integrations/supabase/types';

type DbT10Item = Database['public']['Tables']['t10_items']['Row'];

/**
 * Convert DB row to domain type
 */
function mapDbItemToRow(dbItem: DbT10Item): T10ItemRow {
  return {
    id: dbItem.id,
    week_id: dbItem.week_id,
    rank: dbItem.rank,
    title: dbItem.title,
    taskhub_key: dbItem.taskhub_key,
    assignee_id: dbItem.assignee_id,
    due_date: dbItem.due_date,
    label: dbItem.label,
    description: dbItem.description,
    status: dbItem.status as T10ItemStatus,
    carryover_count: dbItem.carryover_count,
    created_by: dbItem.created_by,
    updated_by: dbItem.updated_by,
    completed_by: dbItem.completed_by,
    created_at: dbItem.created_at,
    updated_at: dbItem.updated_at,
    completed_at: dbItem.completed_at,
  };
}

/**
 * Fetch all items for a week
 */
export async function fetchT10Items(weekId: string): Promise<T10ItemWithAssignee[]> {
  const { data, error } = await supabase
    .from('t10_items')
    .select(`
      *,
      assignee:profiles!t10_items_assignee_id_fkey(id, full_name, avatar_url)
    `)
    .eq('week_id', weekId)
    .order('rank', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((item: any) => ({
    ...mapDbItemToRow(item),
    assignee: item.assignee,
  }));
}

/**
 * Fetch a single item by ID
 */
export async function fetchT10Item(itemId: string): Promise<T10ItemWithAssignee> {
  const { data, error } = await supabase
    .from('t10_items')
    .select(`
      *,
      assignee:profiles!t10_items_assignee_id_fkey(id, full_name, avatar_url)
    `)
    .eq('id', itemId)
    .single();

  if (error) throw new Error(error.message);
  return {
    ...mapDbItemToRow(data),
    assignee: data.assignee,
  };
}

/**
 * Create a new item
 */
export async function createT10Item(input: T10ItemInsert): Promise<T10ItemRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get next available rank if not provided
  let targetRank = input.rank;
  if (targetRank === undefined) {
    const { data: existingItems } = await supabase
      .from('t10_items')
      .select('rank')
      .eq('week_id', input.week_id)
      .order('rank', { ascending: false })
      .limit(1);

    targetRank = (existingItems?.[0]?.rank || 0) + 1;
  }

  const { data, error } = await supabase
    .from('t10_items')
    .insert({
      week_id: input.week_id,
      title: input.title,
      description: input.description || null,
      rank: targetRank,
      status: 'todo',
      taskhub_key: input.taskhub_key || null,
      assignee_id: input.assignee_id || null,
      due_date: input.due_date || null,
      label: input.label || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log activity
  await logItemActivity(data.id, 'created');

  return mapDbItemToRow(data);
}

/**
 * Update an existing item (partial update)
 */
export async function updateT10Item(
  itemId: string, 
  input: Partial<Pick<T10ItemRow, 'title' | 'description' | 'taskhub_key' | 'assignee_id' | 'due_date' | 'label' | 'rank' | 'status'>>
): Promise<T10ItemRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current item for activity logging
  const { data: currentItem } = await supabase
    .from('t10_items')
    .select('rank, status')
    .eq('id', itemId)
    .single();

  const updatePayload: Record<string, unknown> = { ...input, updated_by: user.id };

  // If marking as done, set completed_at and completed_by
  if (input.status === 'done' && currentItem?.status !== 'done') {
    updatePayload.completed_at = new Date().toISOString();
    updatePayload.completed_by = user.id;
  } else if (input.status && input.status !== 'done') {
    updatePayload.completed_at = null;
    updatePayload.completed_by = null;
  }

  const { data, error } = await supabase
    .from('t10_items')
    .update(updatePayload)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log activity for rank change
  if (currentItem && input.rank !== undefined && input.rank !== currentItem.rank) {
    await logItemActivity(itemId, 'rank_changed', { old_rank: currentItem.rank, new_rank: input.rank });
  }

  // Log activity for status change
  if (currentItem && input.status !== undefined && input.status !== currentItem.status) {
    const activityType = input.status === 'done' ? 'completed' : 
                         input.status === 'todo' ? 'uncompleted' : 'updated';
    await logItemActivity(itemId, activityType, { old_status: currentItem.status, new_status: input.status });
  }

  return mapDbItemToRow(data);
}

/**
 * Delete an item
 */
export async function deleteT10Item(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('t10_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

/**
 * Reorder items (batch update ranks)
 */
export async function reorderT10Items(
  weekId: string, 
  itemIds: string[]
): Promise<void> {
  // Update each item's rank based on position in array
  for (let i = 0; i < itemIds.length; i++) {
    const { error } = await supabase
      .from('t10_items')
      .update({ rank: i + 1 })
      .eq('id', itemIds[i]);

    if (error) throw new Error(error.message);
  }
}

/**
 * Toggle item completion status
 */
export async function toggleT10ItemStatus(itemId: string): Promise<T10ItemRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: item, error: fetchError } = await supabase
    .from('t10_items')
    .select('status')
    .eq('id', itemId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const newStatus = item.status === 'done' ? 'todo' : 'done';
  const updatePayload: Record<string, unknown> = { 
    status: newStatus,
    updated_by: user.id,
  };

  if (newStatus === 'done') {
    updatePayload.completed_at = new Date().toISOString();
    updatePayload.completed_by = user.id;
  } else {
    updatePayload.completed_at = null;
    updatePayload.completed_by = null;
  }

  const { data, error } = await supabase
    .from('t10_items')
    .update(updatePayload)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log activity
  const activityType = newStatus === 'done' ? 'completed' : 'uncompleted';
  await logItemActivity(itemId, activityType, { old_status: item.status, new_status: newStatus });

  return mapDbItemToRow(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY LOGGING
// ═══════════════════════════════════════════════════════════════════════════

async function logItemActivity(
  itemId: string,
  activityType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('t10_activity').insert([{
    item_id: itemId,
    activity_type: activityType,
    metadata: (metadata || null) as Json,
    performed_by: user.id,
  }]);
}
