// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ LISTS API
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { T10ListWithStats, T10ListInsert, T10ListUpdate, T10ListStatus } from '../types';
import type { Database } from '@/integrations/supabase/types';

type DbT10List = Database['public']['Tables']['t10_lists']['Row'];

/**
 * Fetch all lists for the current user with computed stats
 */
export async function fetchT10Lists(): Promise<T10ListWithStats[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('t10_lists')
    .select(`
      *,
      creator:profiles!t10_lists_created_by_fkey(id, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Fetch stats for each list
  const listsWithStats = await Promise.all(
    (data || []).map(async (list) => {
      // Get current week (most recent non-checked-out week)
      const { data: currentWeek } = await supabase
        .from('t10_weeks')
        .select('id')
        .eq('list_id', list.id)
        .eq('is_checked_out', false)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .single();

      // Get item counts for current week
      let itemCount = 0;
      let completedCount = 0;

      if (currentWeek) {
        const { data: items } = await supabase
          .from('t10_items')
          .select('id, status')
          .eq('week_id', currentWeek.id);

        itemCount = items?.length || 0;
        completedCount = items?.filter(i => i.status === 'done' || i.status === 'resolved').length || 0;
      }

      return {
        id: list.id,
        list_key: list.list_key,
        name: list.name,
        description: list.description,
        status: list.status as T10ListStatus,
        created_by: list.created_by || '',
        created_at: list.created_at,
        updated_at: list.updated_at,
        item_count: itemCount,
        completed_count: completedCount,
        slots_available: Math.max(0, 10 - itemCount),
        current_week_id: currentWeek?.id || null,
        creator: list.creator,
      } as T10ListWithStats;
    })
  );

  return listsWithStats;
}

/**
 * Fetch a single list by ID
 */
export async function fetchT10List(listId: string): Promise<T10ListWithStats> {
  const { data, error } = await supabase
    .from('t10_lists')
    .select(`
      *,
      creator:profiles!t10_lists_created_by_fkey(id, full_name, avatar_url)
    `)
    .eq('id', listId)
    .single();

  if (error) throw new Error(error.message);

  // Get current week (most recent non-checked-out)
  const { data: currentWeek } = await supabase
    .from('t10_weeks')
    .select('id')
    .eq('list_id', listId)
    .eq('is_checked_out', false)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .single();

  // Get item counts
  let itemCount = 0;
  let completedCount = 0;

  if (currentWeek) {
    const { data: items } = await supabase
      .from('t10_items')
      .select('id, status')
      .eq('week_id', currentWeek.id);

    itemCount = items?.length || 0;
    completedCount = items?.filter(i => i.status === 'done' || i.status === 'resolved').length || 0;
  }

  return {
    id: data.id,
    list_key: data.list_key,
    name: data.name,
    description: data.description,
    status: data.status as T10ListStatus,
    created_by: data.created_by || '',
    created_at: data.created_at,
    updated_at: data.updated_at,
    item_count: itemCount,
    completed_count: completedCount,
    slots_available: Math.max(0, 10 - itemCount),
    current_week_id: currentWeek?.id || null,
    creator: data.creator,
  } as T10ListWithStats;
}

/**
 * Create a new list
 */
export async function createT10List(input: T10ListInsert): Promise<DbT10List> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate next list_key
  const { data: lastList } = await supabase
    .from('t10_lists')
    .select('list_key')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNum = 1;
  if (lastList?.list_key) {
    const match = lastList.list_key.match(/T10-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  const listKey = `T10-${String(nextNum).padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('t10_lists')
    .insert({
      list_key: listKey,
      name: input.name,
      description: input.description || null,
      status: input.status || 'active',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Auto-create first week for new list
  const weekStart = getWeekStart(new Date());
  const weekEnd = getWeekEnd(weekStart);

  await supabase.from('t10_weeks').insert({
    list_id: data.id,
    week_start_date: weekStart.toISOString().split('T')[0],
    week_end_date: weekEnd.toISOString().split('T')[0],
    is_checked_out: false,
  });

  return data;
}

/**
 * Update an existing list
 */
export async function updateT10List(listId: string, input: T10ListUpdate): Promise<DbT10List> {
  const { data, error } = await supabase
    .from('t10_lists')
    .update(input)
    .eq('id', listId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a list (soft delete by setting status to archived)
 */
export async function deleteT10List(listId: string): Promise<void> {
  const { error } = await supabase
    .from('t10_lists')
    .update({ status: 'archived' })
    .eq('id', listId);

  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}
