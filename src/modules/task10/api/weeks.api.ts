// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEKS API
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { T10WeekRow, T10WeekWithItems, T10ItemStatus, CheckoutDecision } from '../types';
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
 * Fetch all weeks for a list
 */
export async function fetchT10Weeks(listId: string): Promise<T10WeekRow[]> {
  const { data, error } = await supabase
    .from('t10_weeks')
    .select('*')
    .eq('list_id', listId)
    .order('week_start_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapDbWeekToRow);
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
 * Checkout request input
 */
export interface CheckoutT10WeekInput {
  weekId: string;
  decisions: Record<string, CheckoutDecision>; // itemId -> 'resolved' | 'carry' | 'remove'
}

/**
 * Check out a week with user decisions for each incomplete item
 */
export async function checkoutT10Week(input: CheckoutT10WeekInput): Promise<T10WeekRow> {
  const { weekId, decisions } = input;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current week data with items
  const { data: currentWeek, error: fetchError } = await supabase
    .from('t10_weeks')
    .select('*, items:t10_items(*)')
    .eq('id', weekId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const items = currentWeek.items || [];
  
  // Process each item based on user decisions
  let resolvedCount = 0;
  let carryCount = 0;
  let removedCount = 0;
  
  // Items that were already done/resolved count as closed
  const alreadyDoneItems = items.filter((i: any) => i.status === 'done' || i.status === 'resolved');
  resolvedCount += alreadyDoneItems.length;

  // Process incomplete items based on decisions
  const incompleteItems = items.filter((i: any) => i.status === 'todo');
  const itemsToCarry: any[] = [];
  
  for (const item of incompleteItems) {
    const decision = decisions[item.id] || 'carry'; // Default to carry if no decision
    
    if (decision === 'resolved') {
      // Mark as done in current week
      await supabase
        .from('t10_items')
        .update({ 
          status: 'done',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', item.id);
      resolvedCount++;
      
    } else if (decision === 'remove') {
      // Mark as removed (soft delete - update status)
      await supabase
        .from('t10_items')
        .update({ 
          status: 'removed',
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', item.id);
      removedCount++;
      
    } else {
      // carry - will be copied to next week
      itemsToCarry.push(item);
      carryCount++;
    }
  }

  // Mark current week as checked out
  const { error: updateError } = await supabase
    .from('t10_weeks')
    .update({
      is_checked_out: true,
      checked_out_at: new Date().toISOString(),
      checked_out_by: user.id,
      closed_count: resolvedCount,
      carried_count: carryCount,
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

  // Carry over items with incremented carryover count
  if (itemsToCarry.length > 0) {
    const carryOverItems = itemsToCarry.map((item: any, index: number) => ({
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

  // Log activity
  await supabase.from('t10_activity').insert({
    item_id: null, // Week-level activity
    activity_type: 'week_checked_out',
    performed_by: user.id,
    metadata: {
      week_id: weekId,
      new_week_id: newWeek.id,
      resolved_count: resolvedCount,
      carried_count: carryCount,
      removed_count: removedCount,
    },
  });

  return mapDbWeekToRow(newWeek);
}
