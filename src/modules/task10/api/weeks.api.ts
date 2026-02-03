// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEKS API
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { T10WeekRow, T10WeekWithItems, T10WeekHistory, T10ItemStatus, CheckoutDecision } from '../types';
import type { Database } from '@/integrations/supabase/types';

type DbT10Week = Database['public']['Tables']['t10_weeks']['Row'];

/**
 * Convert DB row to domain type
 */
function mapDbWeekToRow(dbWeek: DbT10Week): T10WeekRow {
  return {
    id: dbWeek.id,
    list_id: dbWeek.list_id,
    week_start_date: dbWeek.week_start_date,
    week_end_date: dbWeek.week_end_date,
    is_checked_out: dbWeek.is_checked_out,
    checked_out_by: dbWeek.checked_out_by,
    checked_out_at: dbWeek.checked_out_at,
    closed_count: dbWeek.closed_count,
    carried_count: dbWeek.carried_count,
    removed_count: dbWeek.removed_count,
    created_at: dbWeek.created_at,
    updated_at: dbWeek.updated_at,
  };
}

/**
 * Fetch all weeks for a list (with user info for history display)
 */
export async function fetchT10Weeks(listId: string): Promise<T10WeekHistory[]> {
  const { data, error } = await supabase
    .from('t10_weeks')
    .select(`
      *,
      checked_out_user:profiles!t10_weeks_checked_out_by_fkey(id, full_name, avatar_url)
    `)
    .eq('list_id', listId)
    .order('week_start_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((w: any) => ({
    id: w.id,
    week_start_date: w.week_start_date,
    week_end_date: w.week_end_date,
    is_checked_out: w.is_checked_out,
    checked_out_by: w.checked_out_by,
    checked_out_at: w.checked_out_at,
    closed_count: w.closed_count,
    carried_count: w.carried_count,
    removed_count: w.removed_count,
    checked_out_user: w.checked_out_user,
  }));
}

/**
 * Fetch the current (most recent non-checked-out) week for a list with items
 */
export async function fetchT10CurrentWeek(listId: string): Promise<T10WeekWithItems | null> {
  const { data, error } = await supabase
    .from('t10_weeks')
    .select(`
      *,
      items:t10_items(
        *,
        assignee:profiles!t10_items_assignee_id_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('list_id', listId)
    .eq('is_checked_out', false)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No current week
    throw new Error(error.message);
  }

  const allItems = (data.items || []).sort((a: any, b: any) => a.rank - b.rank);
  const priorityItems = allItems.filter((i: any) => i.rank <= 10);
  const bufferItems = allItems.filter((i: any) => i.rank > 10);

  return {
    ...mapDbWeekToRow(data),
    items: priorityItems.map((item: any) => ({
      ...item,
      status: item.status as T10ItemStatus,
    })),
    buffer_items: bufferItems.map((item: any) => ({
      ...item,
      status: item.status as T10ItemStatus,
    })),
  };
}

/**
 * Fetch a specific week by ID with items
 */
export async function fetchT10Week(weekId: string): Promise<T10WeekWithItems> {
  const { data, error } = await supabase
    .from('t10_weeks')
    .select(`
      *,
      items:t10_items(
        *,
        assignee:profiles!t10_items_assignee_id_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('id', weekId)
    .single();

  if (error) throw new Error(error.message);

  const allItems = (data.items || []).sort((a: any, b: any) => a.rank - b.rank);
  const priorityItems = allItems.filter((i: any) => i.rank <= 10);
  const bufferItems = allItems.filter((i: any) => i.rank > 10);

  return {
    ...mapDbWeekToRow(data),
    items: priorityItems.map((item: any) => ({
      ...item,
      status: item.status as T10ItemStatus,
    })),
    buffer_items: bufferItems.map((item: any) => ({
      ...item,
      status: item.status as T10ItemStatus,
    })),
  };
}

/**
 * Check out a week (finalize and create next week)
 * @param weekId - The week ID to checkout
 * @param decisions - Map of itemId to decision (resolved/carry/remove)
 */
export async function checkoutT10Week(
  weekId: string, 
  decisions: Record<string, CheckoutDecision> = {}
): Promise<T10WeekRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current week data
  const { data: currentWeek, error: fetchError } = await supabase
    .from('t10_weeks')
    .select('*, items:t10_items(*)')
    .eq('id', weekId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const items: any[] = currentWeek.items || [];
  
  // Process decisions - update item statuses based on user decisions
  for (const item of items) {
    const decision = decisions[item.id];
    if (decision === 'resolved') {
      // Mark as resolved/done
      await supabase.from('t10_items').update({ status: 'resolved' }).eq('id', item.id);
      item.status = 'resolved';
    } else if (decision === 'remove') {
      // Mark as removed
      await supabase.from('t10_items').update({ status: 'removed' }).eq('id', item.id);
      item.status = 'removed';
    }
    // 'carry' keeps status as 'todo'
  }

  // Calculate counts based on final statuses
  const closedCount = items.filter((i: any) => i.status === 'done' || i.status === 'resolved').length;
  const carriedCount = items.filter((i: any) => i.status === 'todo').length;
  const removedCount = items.filter((i: any) => i.status === 'removed').length;

  // Mark current week as checked out
  const { error: updateError } = await supabase
    .from('t10_weeks')
    .update({
      is_checked_out: true,
      checked_out_at: new Date().toISOString(),
      checked_out_by: user.id,
      closed_count: closedCount,
      carried_count: carriedCount,
      removed_count: removedCount,
    })
    .eq('id', weekId);

  if (updateError) throw new Error(updateError.message);

  // Create next week
  const weekStart = new Date(currentWeek.week_end_date);
  weekStart.setDate(weekStart.getDate() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data: newWeek, error: createError } = await supabase
    .from('t10_weeks')
    .insert({
      list_id: currentWeek.list_id,
      week_start_date: weekStart.toISOString().split('T')[0],
      week_end_date: weekEnd.toISOString().split('T')[0],
      is_checked_out: false,
    })
    .select()
    .single();

  if (createError) throw new Error(createError.message);

  // Carry over items marked as 'carry' (still 'todo')
  const carryItems = items.filter((i: any) => i.status === 'todo');
  
  if (carryItems.length > 0) {
    const carryOverItems = carryItems.map((item: any, index: number) => ({
      week_id: newWeek.id,
      title: item.title,
      description: item.description,
      rank: index + 1,
      status: 'todo',
      taskhub_key: item.taskhub_key,
      assignee_id: item.assignee_id,
      due_date: item.due_date,
      label: item.label,
      carryover_count: (item.carryover_count || 0) + 1,
      created_by: user.id,
    }));

    await supabase.from('t10_items').insert(carryOverItems);
  }

  return mapDbWeekToRow(newWeek);
}
