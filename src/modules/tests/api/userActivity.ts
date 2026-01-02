/**
 * User Activity API
 * Queries and aggregates user activity data from test_activity_log
 */

import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, parseISO } from 'date-fns';

export type TimeGrouping = 'none' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export type ActivityType = 
  | 'case_created'
  | 'case_updated'
  | 'case_automated'
  | 'case_assigned'
  | 'run_executed'
  | 'effort_logged'
  | 'defect_discovered';

export interface UserActivityFilters {
  userIds: string[];
  startDate: string;
  endDate?: string;
  groupBy: TimeGrouping;
  currentProjectOnly: boolean;
  projectId?: string;
  includeLimitedVisibility: boolean;
  activityTypes: ActivityType[];
}

export interface ActivityAggregate {
  userId: string;
  userName: string;
  userEmail: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  casesCreated: number;
  casesUpdated: number;
  casesAutomated: number;
  casesAssigned: number;
  runsExecuted: number;
  effortHours: number;
  defectsDiscovered: number;
  totalActions: number;
  items: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  activityType: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * Get period key for grouping
 */
function getPeriodKey(date: Date, grouping: TimeGrouping): string {
  switch (grouping) {
    case 'day':
      return format(date, 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(date), 'yyyy-MM');
    case 'quarter':
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${date.getFullYear()}-Q${q}`;
    case 'year':
      return format(startOfYear(date), 'yyyy');
    default:
      return 'all';
  }
}

/**
 * Get period display label
 */
function getPeriodLabel(date: Date, grouping: TimeGrouping): string {
  switch (grouping) {
    case 'day':
      return format(date, 'MMM d, yyyy');
    case 'week':
      return `Week of ${format(startOfWeek(date, { weekStartsOn: 0 }), 'MMM d, yyyy')}`;
    case 'month':
      return format(date, 'MMMM yyyy');
    case 'quarter':
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `Q${q} ${date.getFullYear()}`;
    case 'year':
      return format(date, 'yyyy');
    default:
      return 'All Time';
  }
}

/**
 * Map activity type from DB to our type
 */
function mapActivityType(dbType: string): ActivityType | null {
  const mapping: Record<string, ActivityType> = {
    'case_created': 'case_created',
    'case_updated': 'case_updated',
    'case_automated': 'case_automated',
    'assigned': 'case_assigned',
    'run_executed': 'run_executed',
    'execution_completed': 'run_executed',
    'effort_logged': 'effort_logged',
    'defect_created': 'defect_discovered',
    'defect_linked': 'defect_discovered',
  };
  return mapping[dbType] || null;
}

/**
 * Fetch and aggregate user activity
 */
export async function fetchUserActivity(filters: UserActivityFilters): Promise<ActivityAggregate[]> {
  if (!filters.userIds.length) return [];

  const endDate = filters.endDate || format(new Date(), 'yyyy-MM-dd');
  
  // Build query
  let query = supabase
    .from('test_activity_log')
    .select('*')
    .in('user_id', filters.userIds)
    .gte('created_at', `${filters.startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: false });

  // Filter by project if needed
  if (filters.currentProjectOnly && filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }

  const { data: activities, error } = await query;
  
  if (error) throw error;

  // Fetch user profiles for names
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', filters.userIds);

  const userMap = new Map(
    (profiles || []).map(p => [p.id, { name: p.full_name || p.email || 'Unknown', email: p.email || '' }])
  );

  // Map activity types to filter
  const activityTypeMap: Record<ActivityType, string[]> = {
    'case_created': ['case_created'],
    'case_updated': ['case_updated'],
    'case_automated': ['case_automated'],
    'case_assigned': ['assigned', 'case_assigned'],
    'run_executed': ['run_executed', 'execution_completed'],
    'effort_logged': ['effort_logged'],
    'defect_discovered': ['defect_created', 'defect_linked'],
  };

  // Filter activities by selected types
  const allowedTypes = new Set(
    filters.activityTypes.flatMap(t => activityTypeMap[t] || [])
  );

  const filteredActivities = (activities || []).filter(
    a => allowedTypes.has(a.activity_type)
  );

  // Aggregate by user and period
  const aggregates = new Map<string, ActivityAggregate>();

  for (const activity of filteredActivities) {
    const actDate = activity.created_at ? new Date(activity.created_at) : new Date();
    const periodKey = getPeriodKey(actDate, filters.groupBy);
    const user = userMap.get(activity.user_id) || { name: 'Unknown', email: '' };
    const key = `${activity.user_id}::${periodKey}`;

    if (!aggregates.has(key)) {
      aggregates.set(key, {
        userId: activity.user_id,
        userName: user.name,
        userEmail: user.email,
        period: getPeriodLabel(actDate, filters.groupBy),
        periodStart: periodKey,
        periodEnd: periodKey,
        casesCreated: 0,
        casesUpdated: 0,
        casesAutomated: 0,
        casesAssigned: 0,
        runsExecuted: 0,
        effortHours: 0,
        defectsDiscovered: 0,
        totalActions: 0,
        items: [],
      });
    }

    const agg = aggregates.get(key)!;
    const mappedType = mapActivityType(activity.activity_type);
    
    // Increment counts
    switch (mappedType) {
      case 'case_created':
        agg.casesCreated++;
        break;
      case 'case_updated':
        agg.casesUpdated++;
        break;
      case 'case_automated':
        agg.casesAutomated++;
        break;
      case 'case_assigned':
        agg.casesAssigned++;
        break;
      case 'run_executed':
        agg.runsExecuted++;
        break;
      case 'effort_logged':
        const hours = (activity as any).effort_hours || 0;
        agg.effortHours += Number(hours);
        break;
      case 'defect_discovered':
        agg.defectsDiscovered++;
        break;
    }
    
    agg.totalActions++;
    agg.items.push({
      id: activity.id,
      entityType: activity.entity_type,
      entityId: activity.entity_id,
      entityTitle: activity.entity_title || 'Untitled',
      activityType: activity.activity_type,
      createdAt: activity.created_at,
      metadata: (activity as any).metadata,
    });
  }

  return Array.from(aggregates.values()).sort((a, b) => {
    // Sort by period descending, then by user name
    if (a.periodStart !== b.periodStart) {
      return b.periodStart.localeCompare(a.periodStart);
    }
    return a.userName.localeCompare(b.userName);
  });
}

/**
 * Fetch detailed items for drill-down
 */
export async function fetchActivityItems(
  userId: string,
  activityType: ActivityType,
  startDate: string,
  endDate: string,
  projectId?: string
): Promise<ActivityItem[]> {
  const activityTypeMap: Record<ActivityType, string[]> = {
    'case_created': ['case_created'],
    'case_updated': ['case_updated'],
    'case_automated': ['case_automated'],
    'case_assigned': ['assigned', 'case_assigned'],
    'run_executed': ['run_executed', 'execution_completed'],
    'effort_logged': ['effort_logged'],
    'defect_discovered': ['defect_created', 'defect_linked'],
  };

  const types = activityTypeMap[activityType] || [];

  let query = supabase
    .from('test_activity_log')
    .select('*')
    .eq('user_id', userId)
    .in('activity_type', types)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  
  if (error) throw error;

  return (data || []).map(a => ({
    id: a.id,
    entityType: a.entity_type,
    entityId: a.entity_id,
    entityTitle: a.entity_title || 'Untitled',
    activityType: a.activity_type,
    createdAt: a.created_at,
    metadata: (a as any).metadata,
  }));
}

/**
 * Log a test activity event
 */
export async function logTestActivity(
  userId: string,
  activityType: string,
  entityType: string,
  entityId: string,
  entityTitle: string,
  options?: {
    programId?: string;
    projectId?: string;
    description?: string;
    effortHours?: number;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const { error } = await supabase
    .from('test_activity_log')
    .insert({
      user_id: userId,
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: options?.programId,
      project_id: options?.projectId,
      description: options?.description,
      effort_hours: options?.effortHours,
      metadata: options?.metadata || {},
    });

  if (error) {
    console.error('Failed to log test activity:', error);
  }
}
