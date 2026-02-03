// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ ACTIVITY API
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { T10ActivityRow, T10ActivityWithUser, T10ActivityType } from '../types';
import type { Database, Json } from '@/integrations/supabase/types';

type DbT10Activity = Database['public']['Tables']['t10_activity']['Row'];

/**
 * Convert DB row to domain type
 */
function mapDbActivityToRow(dbActivity: DbT10Activity): T10ActivityRow {
  return {
    id: dbActivity.id,
    item_id: dbActivity.item_id,
    activity_type: dbActivity.activity_type as T10ActivityType,
    performed_by: dbActivity.performed_by || '',
    performed_at: dbActivity.performed_at,
    metadata: (dbActivity.metadata as Record<string, unknown>) || {},
  };
}

/**
 * Fetch activity for an item
 */
export async function fetchT10ItemActivity(
  itemId: string
): Promise<T10ActivityWithUser[]> {
  const { data, error } = await supabase
    .from('t10_activity')
    .select(`
      *,
      performer:profiles!t10_activity_performed_by_fkey(id, full_name, avatar_url)
    `)
    .eq('item_id', itemId)
    .order('performed_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((activity: any) => ({
    ...mapDbActivityToRow(activity),
    performer: activity.performer,
  }));
}

/**
 * Fetch activity for multiple items (e.g., for a week)
 */
export async function fetchT10ItemsActivity(
  itemIds: string[],
  limit: number = 50
): Promise<T10ActivityWithUser[]> {
  if (itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from('t10_activity')
    .select(`
      *,
      performer:profiles!t10_activity_performed_by_fkey(id, full_name, avatar_url),
      item:t10_items(id, title)
    `)
    .in('item_id', itemIds)
    .order('performed_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map((activity: any) => ({
    ...mapDbActivityToRow(activity),
    performer: activity.performer,
    item: activity.item,
  }));
}

/**
 * Create a manual activity entry
 */
export async function createT10Activity(input: {
  item_id: string;
  activity_type: T10ActivityType;
  metadata?: Record<string, unknown>;
}): Promise<T10ActivityRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('t10_activity')
    .insert([{
      item_id: input.item_id,
      activity_type: input.activity_type,
      metadata: (input.metadata || null) as Json,
      performed_by: user.id,
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapDbActivityToRow(data);
}
