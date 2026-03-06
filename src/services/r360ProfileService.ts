/**
 * R360 Profile Service — queries r360_resources, r360_work_items, 
 * r360_weekly_snapshots, r360_activity_log
 * 
 * Adapted to actual DB schema:
 *   r360_resources: rid, full_name, job_role, initials, department_id, is_active
 *   r360_work_items: item_key, title, status, work_item_type, source_hub, resource_id
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  R360ProfileResource, R360ProfileWorkItem, R360WeeklyStats,
  R360ClosureTrendPoint, ResourceAvailability, WorkItemStatus, WorkItemType,
} from '@/types/r360';

export const r360ProfileService = {
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
      .eq('resource_id', resourceId)
      .order('updated_at', { ascending: false });

    if (!statusFilter || statusFilter === 'open') {
      query = query.not('status', 'ilike', '%done%')
                   .not('status', 'ilike', '%production%')
                   .not('status', 'ilike', '%closed%');
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
    const rows = data ?? [];
    const maxWeek = rows.length ? Math.max(...rows.map((r: any) => r.week_number)) : 0;
    return rows.map((row: any) => ({
      weekNumber: row.week_number,
      weekLabel: `W${row.week_number}`,
      closedCount: row.closed_this_week,
      isCurrent: row.week_number === maxWeek,
    }));
  },

  async getActivityLog(resourceId: string, weekStart: string, weekEnd: string) {
    const { data, error } = await supabase
      .from('r360_activity_log' as any)
      .select('*, r360_work_items(item_key, title, work_item_type, status)')
      .eq('resource_id', resourceId)
      .gte('event_time', weekStart)
      .lte('event_time', weekEnd)
      .order('event_time', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};

// ─── Mappers (actual DB schema → camelCase interfaces) ───

function mapResource(r: any): R360ProfileResource {
  return {
    id: r.id,
    resourceKey: r.rid ?? r.resource_key ?? '',
    fullName: r.full_name,
    role: r.job_role ?? r.role ?? '',
    department: r.department_id ?? r.department ?? 'Delivery',
    skills: r.skills ?? [],
    availability: 'available' as ResourceAvailability,
    avatarInitials: r.initials ?? r.avatar_initials ?? '',
    avatarGradientStart: r.avatar_gradient_start ?? '#3B82F6',
    avatarGradientEnd: r.avatar_gradient_end ?? '#7C3AED',
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
  const ageDays = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
  return {
    id: r.id,
    itemKey: r.item_key,
    title: r.title,
    status: mapStatus(r.status),
    itemType: (r.work_item_type ?? r.item_type ?? 'Task') as WorkItemType,
    hubSource: r.source_hub ?? r.hub_source ?? 'BAU',
    assigneeId: r.resource_id ?? r.assignee_id ?? '',
    updatedAt: r.updated_at,
    createdAt: r.created_at,
    ageDays,
  };
}

function mapStatus(raw: string): WorkItemStatus {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('done') || s.includes('production') || s.includes('closed')) return 'DONE';
  if (s.includes('review') || s.includes('qa')) return 'IN_REVIEW';
  if (s.includes('progress')) return 'IN_PROGRESS';
  return 'TO_DO';
}
