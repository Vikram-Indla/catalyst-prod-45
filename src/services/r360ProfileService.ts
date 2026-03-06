import { supabase } from '@/integrations/supabase/client';
import type {
  R360ProfileResource, R360ProfileWorkItem, R360WeeklyStats,
  R360ClosureTrendPoint, ResourceAvailability, WorkItemStatus, WorkItemType,
} from '@/types/r360';

export const r360Service = {
  async getResources(): Promise<R360ProfileResource[]> {
    const { data, error } = await supabase
      .from('r360_resources' as any)
      .select('*')
      .eq('is_active', true)
      .order('full_name');
    if (error) throw error;
    return (data ?? []).map(mapResource);
  },

  async getWeeklyStats(resourceId: string, weekNumber: number): Promise<R360WeeklyStats | null> {
    const { data, error } = await supabase
      .from('r360_weekly_snapshots' as any)
      .select('*')
      .eq('resource_id', resourceId)
      .eq('week_number', weekNumber)
      .maybeSingle();
    if (error) throw error;
    return data ? mapWeeklyStats(data) : null;
  },

  async getWorkItems(resourceId: string, statusFilter?: string): Promise<R360ProfileWorkItem[]> {
    let query = supabase
      .from('r360_work_items' as any)
      .select('*')
      .eq('assignee_id', resourceId)
      .order('updated_at', { ascending: false });

    if (!statusFilter || statusFilter === 'open') {
      query = query.neq('status', 'DONE');
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapWorkItem);
  },

  async getClosureTrend(resourceId: string): Promise<R360ClosureTrendPoint[]> {
    const { data, error } = await supabase
      .from('r360_weekly_snapshots' as any)
      .select('week_number, closed_this_week')
      .eq('resource_id', resourceId)
      .order('week_number', { ascending: true })
      .limit(8);
    if (error) throw error;
    const maxWeek = Math.max(...(data ?? []).map((r: any) => r.week_number));
    return (data ?? []).map((row: any) => ({
      weekNumber: row.week_number,
      weekLabel: `W${row.week_number}`,
      closedCount: row.closed_this_week,
      isCurrent: row.week_number === maxWeek,
    }));
  },

  async getActivityLog(resourceId: string, weekStart: string, weekEnd: string) {
    const { data, error } = await supabase
      .from('r360_activity_log' as any)
      .select('*, r360_work_items(item_key, title, item_type, status)')
      .eq('resource_id', resourceId)
      .gte('event_time', weekStart)
      .lte('event_time', weekEnd)
      .order('event_time', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};

// ─── Mappers ───
function mapResource(r: any): R360ProfileResource {
  return {
    id: r.id,
    resourceKey: r.resource_key,
    fullName: r.full_name,
    role: r.role,
    department: r.department,
    skills: r.skills ?? [],
    availability: 'available' as ResourceAvailability,
    avatarInitials: r.avatar_initials,
    avatarGradientStart: r.avatar_gradient_start,
    avatarGradientEnd: r.avatar_gradient_end,
    openItemCount: 0,
    roleAvgOpenCount: 5,
  };
}

function mapWeeklyStats(r: any): R360WeeklyStats {
  return {
    resourceId: r.resource_id,
    weekNumber: r.week_number,
    weekStart: r.week_start,
    weekEnd: r.week_end,
    totalOpen: r.total_open,
    closedThisWeek: r.closed_this_week,
    inReview: r.in_review,
    pickupSpeedHours: Number(r.pickup_speed_hours),
    inProgressConcurrent: r.in_progress_concurrent,
    closedOfTouched: r.closed_of_touched,
    totalTouched: r.total_touched,
    avgCycleTimeDays: Number(r.avg_cycle_time_days),
    oldestItemAgeDays: r.oldest_item_age_days,
    oldestItemKey: r.oldest_item_key ?? '',
    closureRatePct: Number(r.closure_rate_pct),
  };
}

function mapWorkItem(r: any): R360ProfileWorkItem {
  const created = new Date(r.created_at);
  const ageDays = Math.floor((Date.now() - created.getTime()) / 86400000);
  return {
    id: r.id,
    itemKey: r.item_key,
    title: r.title,
    status: r.status as WorkItemStatus,
    itemType: r.item_type as WorkItemType,
    hubSource: r.hub_source,
    assigneeId: r.assignee_id,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
    ageDays,
  };
}
