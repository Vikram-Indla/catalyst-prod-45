// src/hooks/home/useUnifiedHomeData.ts
// Unified data hook that provides same interface for all modes

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';
import { HomeFilters, HomeRoleMode, HomeDomain } from './useHomeFilters';

// ============================================
// NAVIGATION METADATA FOR WORK ITEMS
// ============================================
export interface WorkItemNavigation {
  path: string;
  fallbackPath: string;
  openBehavior: 'push' | 'new-tab';
}

export interface WorkItemContext {
  programId?: string;
  projectId?: string;
  industryView?: boolean;
}

// ============================================
// UNIFIED WORK ITEM TYPE
// ============================================
export interface UnifiedWorkItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  status: string;
  type: WorkItemType;
  domain: HomeDomain; // Which domain this item belongs to
  assignee: string | null;
  activityDate: Date;
  activityType: 'Updated' | 'Created';
  priority?: string;
  severity?: string;
  blocked?: boolean;
  plannedDate?: Date;
  readyForSprint?: boolean;
  decisionRequired?: boolean;
  reviewStatus?: string;
  // Navigation metadata
  nav: WorkItemNavigation;
  context: WorkItemContext;
}

// ============================================
// UNIFIED SUMMARY TYPE
// ============================================
export interface UnifiedSummary {
  workedOn: number;
  assigned: number;
  starred: number;
  total: number;
}

// ============================================
// UNIFIED RESPONSE TYPE
// ============================================
export interface UnifiedItemsResponse {
  items: UnifiedWorkItem[];
  counts: UnifiedSummary;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================
// QUERY PARAMS
// ============================================
export interface UnifiedQueryParams {
  mode: HomeRoleMode;
  filters: HomeFilters;
  search: string;
  sort: 'updated' | 'priority' | 'status' | 'planned-date';
  page: number;
  pageSize: number;
  userId?: string;
}

// ============================================
// HELPER: Apply updated range filter
// ============================================
function getUpdatedRangeDate(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

// ============================================
// HELPER: Generate navigation metadata for work items
// ============================================
function generateNavigation(
  domain: HomeDomain,
  type: WorkItemType,
  id: string,
  key: string,
  context: WorkItemContext
): WorkItemNavigation {
  // Operations (Incidents)
  if (domain === 'operations' || type === 'defect') {
    return {
      path: `/release/incidents/${id}`,
      fallbackPath: '/release/incidents',
      openBehavior: 'push',
    };
  }

  // Planner (Tasks)
  if (domain === 'planner' || type === 'task') {
    return {
      path: `/planner/tasks?taskId=${id}`,
      fallbackPath: '/planner/tasks',
      openBehavior: 'push',
    };
  }

  // Delivery - determine best route based on context
  if (context.programId) {
    return {
      path: `/program/${context.programId}/epic-backlog?focusKey=${encodeURIComponent(key)}`,
      fallbackPath: `/program/${context.programId}/epic-backlog`,
      openBehavior: 'push',
    };
  }

  if (context.projectId) {
    return {
      path: `/projects/${context.projectId}/work?focusKey=${encodeURIComponent(key)}`,
      fallbackPath: `/projects/${context.projectId}/work`,
      openBehavior: 'push',
    };
  }

  if (context.industryView) {
    return {
      path: `/industry/backlog?focusKey=${encodeURIComponent(key)}`,
      fallbackPath: '/industry/backlog',
      openBehavior: 'push',
    };
  }

  // Default to industry backlog with focus
  return {
    path: `/industry/backlog?focusKey=${encodeURIComponent(key)}`,
    fallbackPath: '/industry/backlog',
    openBehavior: 'push',
  };
}

// ============================================
// UNIFIED SUMMARY HOOK
// ============================================
export function useUnifiedHomeSummary(mode: HomeRoleMode, userId?: string) {
  return useQuery({
    queryKey: ['home-unified-summary', mode, userId],
    queryFn: async (): Promise<UnifiedSummary> => {
      switch (mode) {
        case 'all': {
          // Aggregate counts from all domains
          const [incidentsTotal, incidentsAssigned, storiesTotal, storiesAssigned, featuresTotal, tasksPlanned, tasksUpcoming] = await Promise.all([
            supabase.from('incidents').select('id', { count: 'exact', head: true }).is('deleted_at', null),
            supabase.from('incidents').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
            supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null),
            supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
            supabase.from('features').select('id', { count: 'exact', head: true }).is('deleted_at', null),
            supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true }).or('status.in.(Planned,In Progress),ready_for_sprint.eq.true'),
            supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true }).in('status', ['Backlog', 'On Hold']),
          ]);

          const workedOn = (incidentsTotal.count || 0) + (storiesTotal.count || 0) + (featuresTotal.count || 0) + (tasksPlanned.count || 0);
          const assigned = (incidentsAssigned.count || 0) + (storiesAssigned.count || 0) + (tasksUpcoming.count || 0);

          return {
            workedOn,
            assigned,
            starred: 0,
            total: workedOn,
          };
        }

        case 'operations': {
          const { count: totalCount } = await supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null);
          
          const { count: assignedCount } = await supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .not('assignee_id', 'is', null);

          return {
            workedOn: totalCount || 0,
            assigned: assignedCount || 0,
            starred: 0,
            total: totalCount || 0,
          };
        }

        case 'delivery': {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const [storyResult, featureResult, assignedResult] = await Promise.all([
            supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null),
            supabase.from('features').select('id', { count: 'exact', head: true }).is('deleted_at', null),
            supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
          ]);

          const total = (storyResult.count || 0) + (featureResult.count || 0);

          return {
            workedOn: total,
            assigned: assignedResult.count || 0,
            starred: 0,
            total,
          };
        }

        case 'planner': {
          const [plannedResult, upcomingResult, pendingResult] = await Promise.all([
            supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
              .or('status.in.(Planned,In Progress),ready_for_sprint.eq.true'),
            supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
              .in('status', ['Backlog', 'On Hold']),
            supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
              .or('decision_required.eq.true,review_status.eq.pending'),
          ]);

          const total = (plannedResult.count || 0) + (upcomingResult.count || 0);

          return {
            workedOn: plannedResult.count || 0,
            assigned: upcomingResult.count || 0,
            starred: pendingResult.count || 0,
            total,
          };
        }

        default:
          return { workedOn: 0, assigned: 0, starred: 0, total: 0 };
      }
    },
    staleTime: 1000 * 15, // 15 seconds
    refetchInterval: 1000 * 15, // Poll every 15 seconds
    refetchOnWindowFocus: true,
  });
}

// ============================================
// UNIFIED ITEMS HOOK
// ============================================
export function useUnifiedHomeItems(params: UnifiedQueryParams) {
  const { mode, filters, search, sort, page, pageSize, userId } = params;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['home-unified-items', mode, filters, search, sort, page, pageSize, userId],
    queryFn: async (): Promise<UnifiedItemsResponse> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const updatedRangeDate = getUpdatedRangeDate(filters.updatedRange);

      // IMPORTANT: Mode takes precedence - each mode shows ONLY its own data types
      // All = all work items, Planner = only tasks, Delivery = only epics/features/stories, Operations = only incidents

      switch (mode) {
        case 'all': {
          return await fetchAllItems({ filters, search, sort, from, to, updatedRangeDate, userId, page, pageSize });
        }

        case 'operations': {
          return await fetchOperationsItems({ filters, search, sort, from, to, updatedRangeDate, userId });
        }

        case 'delivery': {
          return await fetchDeliveryItems({ filters, search, sort, from, to, updatedRangeDate, userId });
        }

        case 'planner': {
          return await fetchPlannerItems({ filters, search, sort, from, to, updatedRangeDate, userId, page, pageSize });
        }

        default:
          return {
            items: [],
            counts: { workedOn: 0, assigned: 0, starred: 0, total: 0 },
            pagination: { page, pageSize, total: 0, hasMore: false },
          };
      }
    },
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 15,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// AGGREGATED ALL DOMAINS FETCH
// ============================================
async function fetchAllItems(params: {
  filters: HomeFilters;
  search: string;
  sort: string;
  from: number;
  to: number;
  updatedRangeDate: Date | null;
  userId?: string;
  page: number;
  pageSize: number;
}): Promise<UnifiedItemsResponse> {
  const { filters, search, sort, from, to, updatedRangeDate, userId, page, pageSize } = params;

  // Fetch from all three domains in parallel
  const [opsResult, deliveryResult, plannerResult] = await Promise.all([
    fetchOperationsItems({ filters, search, sort, from: 0, to: 10, updatedRangeDate, userId }),
    fetchDeliveryItems({ filters, search, sort, from: 0, to: 10, updatedRangeDate, userId }),
    fetchPlannerItems({ filters, search, sort, from: 0, to: 10, updatedRangeDate, userId, page: 1, pageSize: 10 }),
  ]);

  // Combine all items
  let allItems: UnifiedWorkItem[] = [
    ...opsResult.items,
    ...deliveryResult.items,
    ...plannerResult.items,
  ];

  // Sort combined items by activityDate (most recent first) or by the selected sort
  if (sort === 'priority') {
    // Priority sort - order by priority string
    const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    allItems.sort((a, b) => {
      const aOrder = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bOrder = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
      return aOrder - bOrder;
    });
  } else {
    // Default: sort by updated date
    allItems.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());
  }

  // Apply pagination to combined results
  const paginatedItems = allItems.slice(from, to + 1);
  const totalCount = opsResult.counts.total + deliveryResult.counts.total + plannerResult.counts.total;

  return {
    items: paginatedItems,
    counts: {
      workedOn: opsResult.counts.workedOn + deliveryResult.counts.workedOn + plannerResult.counts.workedOn,
      assigned: opsResult.counts.assigned + deliveryResult.counts.assigned + plannerResult.counts.assigned,
      starred: opsResult.counts.starred + deliveryResult.counts.starred + plannerResult.counts.starred,
      total: totalCount,
    },
    pagination: {
      page,
      pageSize,
      total: totalCount,
      hasMore: from + paginatedItems.length < totalCount,
    },
  };
}

// ============================================
// OPERATIONS FETCH
// ============================================
async function fetchOperationsItems(params: {
  filters: HomeFilters;
  search: string;
  sort: string;
  from: number;
  to: number;
  updatedRangeDate: Date | null;
  userId?: string;
}): Promise<UnifiedItemsResponse> {
  const { filters, search, sort, from, to, updatedRangeDate, userId } = params;

  let query = supabase
    .from('incidents')
    .select(`
      id,
      incident_key,
      title,
      status,
      severity,
      is_major_incident,
      assignee_id,
      created_at,
      updated_at,
      project:projects!incidents_project_id_fkey(id, name, key)
    `, { count: 'exact' })
    .is('deleted_at', null);

  // Apply scope filter
  if (filters.scope === 'assigned' && userId) {
    query = query.eq('assignee_id', userId);
  }

  // Apply status filter
  if (filters.status.length > 0) {
    query = query.in('status', filters.status as any);
  }

  // Apply search
  if (search && search.trim()) {
    query = query.or(`title.ilike.%${search}%,incident_key.ilike.%${search}%`);
  }

  // Apply updated range
  if (updatedRangeDate) {
    query = query.gte('updated_at', updatedRangeDate.toISOString());
  }

  // Apply sorting
  if (sort === 'priority') {
    query = query.order('severity', { ascending: true });
  } else {
    query = query.order('updated_at', { ascending: false });
  }

  query = query.range(from, to);

  const { data: incidents, count, error } = await query;
  if (error) throw error;

  const items: UnifiedWorkItem[] = (incidents || []).map(incident => {
    const key = incident.incident_key || `INC-${incident.id.slice(0, 6)}`;
    const context: WorkItemContext = { 
      projectId: incident.project?.id 
    };
    return {
      id: incident.id,
      key,
      summary: incident.title,
      project: incident.project?.name || 'Unknown Project',
      projectKey: incident.project?.key || 'UNK',
      status: incident.status,
      type: 'defect' as WorkItemType,
      domain: 'operations' as HomeDomain,
      assignee: null, // No FK relationship to profiles - would need separate lookup
      activityDate: new Date(incident.updated_at || incident.created_at),
      activityType: 'Updated' as const,
      severity: incident.severity,
      nav: generateNavigation('operations', 'defect', incident.id, key, context),
      context,
    };
  });

  // Get counts
  const [totalResult, assignedResult] = await Promise.all([
    supabase.from('incidents').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('incidents').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
  ]);

  return {
    items,
    counts: {
      workedOn: totalResult.count || 0,
      assigned: assignedResult.count || 0,
      starred: 0,
      total: count || 0,
    },
    pagination: {
      page: Math.floor(from / (to - from + 1)) + 1,
      pageSize: to - from + 1,
      total: count || 0,
      hasMore: from + items.length < (count || 0),
    },
  };
}

// ============================================
// DELIVERY FETCH
// ============================================
async function fetchDeliveryItems(params: {
  filters: HomeFilters;
  search: string;
  sort: string;
  from: number;
  to: number;
  updatedRangeDate: Date | null;
  userId?: string;
}): Promise<UnifiedItemsResponse> {
  const { filters, search, sort, from, to, updatedRangeDate, userId } = params;

  const items: UnifiedWorkItem[] = [];
  let totalStories = 0;
  let totalFeatures = 0;

  // Fetch stories
  let storyQuery = supabase
    .from('stories')
    .select(`
      id,
      story_key,
      title,
      name,
      status,
      state,
      priority,
      assignee_id,
      blocked,
      created_at,
      updated_at,
      feature:features(id, name, display_id)
    `, { count: 'exact' })
    .is('deleted_at', null);

  if (filters.scope === 'assigned' && userId) {
    storyQuery = storyQuery.eq('assignee_id', userId);
  }

  if (filters.status.length > 0) {
    storyQuery = storyQuery.in('status', filters.status as any);
  }

  if (filters.priority.length > 0) {
    storyQuery = storyQuery.in('priority', filters.priority as any);
  }

  if (search && search.trim()) {
    storyQuery = storyQuery.or(`title.ilike.%${search}%,story_key.ilike.%${search}%,name.ilike.%${search}%`);
  }

  if (updatedRangeDate) {
    storyQuery = storyQuery.gte('updated_at', updatedRangeDate.toISOString());
  }

  if (sort === 'priority') {
    storyQuery = storyQuery.order('priority', { ascending: true });
  } else {
    storyQuery = storyQuery.order('updated_at', { ascending: false });
  }

  storyQuery = storyQuery.range(from, to);

  const { data: stories, count: storyCount, error: storyError } = await storyQuery;
  if (storyError) throw storyError;

  totalStories = storyCount || 0;

  (stories || []).forEach(story => {
    const key = story.story_key || `US-${story.id.slice(0, 6)}`;
    const context: WorkItemContext = {
      projectId: story.feature?.id,
      industryView: !story.feature,
    };
    items.push({
      id: story.id,
      key,
      summary: story.title || story.name || 'Untitled Story',
      project: story.feature?.name || 'Backlog',
      projectKey: story.feature?.display_id || 'BKL',
      status: story.status || story.state || 'Open',
      type: 'story' as WorkItemType,
      domain: 'delivery' as HomeDomain,
      assignee: null, // No FK relationship to profiles - would need separate lookup
      activityDate: new Date(story.updated_at || story.created_at),
      activityType: 'Updated' as const,
      priority: story.priority,
      blocked: story.blocked,
      nav: generateNavigation('delivery', 'story', story.id, key, context),
      context,
    });
  });

  // Fetch features if not filtering by scope (features don't have assignees)
  if (filters.scope === 'worked-on') {
    let featureQuery = supabase
      .from('features')
      .select(`
        id,
        display_id,
        name,
        status,
        priority,
        blocked,
        created_at,
        updated_at,
        epic:epics(id, name, epic_key)
      `, { count: 'exact' })
      .is('deleted_at', null);

    if (filters.status.length > 0) {
      featureQuery = featureQuery.in('status', filters.status as any);
    }

    if (filters.priority.length > 0) {
      featureQuery = featureQuery.in('priority', filters.priority as any);
    }

    if (search && search.trim()) {
      featureQuery = featureQuery.or(`name.ilike.%${search}%,display_id.ilike.%${search}%`);
    }

    if (updatedRangeDate) {
      featureQuery = featureQuery.gte('updated_at', updatedRangeDate.toISOString());
    }

    if (sort === 'priority') {
      featureQuery = featureQuery.order('priority', { ascending: true });
    } else {
      featureQuery = featureQuery.order('updated_at', { ascending: false });
    }

    featureQuery = featureQuery.range(from, to);

    const { data: features, count: featureCount, error: featureError } = await featureQuery;
    if (featureError) throw featureError;

    totalFeatures = featureCount || 0;

    (features || []).forEach(feature => {
      const key = feature.display_id || `F-${feature.id.slice(0, 6)}`;
      const context: WorkItemContext = {
        programId: feature.epic?.id,
        industryView: !feature.epic,
      };
      items.push({
        id: feature.id,
        key,
        summary: feature.name,
        project: feature.epic?.name || 'Portfolio',
        projectKey: feature.epic?.epic_key || 'PRT',
        status: feature.status || 'Open',
        type: 'feature' as WorkItemType,
        domain: 'delivery' as HomeDomain,
        assignee: null,
        activityDate: new Date(feature.updated_at || feature.created_at),
        activityType: 'Updated' as const,
        priority: feature.priority,
        blocked: feature.blocked,
        nav: generateNavigation('delivery', 'feature', feature.id, key, context),
        context,
      });
    });
  }

  // Sort combined items
  items.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());

  // Get counts
  const [workedOnResult, assignedResult] = await Promise.all([
    supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
  ]);

  const total = totalStories + totalFeatures;

  return {
    items: items.slice(0, to - from + 1),
    counts: {
      workedOn: (workedOnResult.count || 0) + totalFeatures,
      assigned: assignedResult.count || 0,
      starred: 0,
      total,
    },
    pagination: {
      page: Math.floor(from / (to - from + 1)) + 1,
      pageSize: to - from + 1,
      total,
      hasMore: from + items.length < total,
    },
  };
}

// ============================================
// PLANNER FETCH
// ============================================
async function fetchPlannerItems(params: {
  filters: HomeFilters;
  search: string;
  sort: string;
  from: number;
  to: number;
  updatedRangeDate: Date | null;
  userId?: string;
  page: number;
  pageSize: number;
}): Promise<UnifiedItemsResponse> {
  const { filters, search, sort, from, to, updatedRangeDate, userId, page, pageSize } = params;

  let query = supabase
    .from('work_manager_tasks')
    .select(`
      id,
      key,
      title,
      status,
      priority,
      assignee_id,
      team_id,
      due_date,
      planned_date,
      ready_for_sprint,
      decision_required,
      review_status,
      blocked,
      created_at,
      updated_at
    `, { count: 'exact' });

  // Apply scope mapping for planner
  // worked-on = Planned, In Progress (active work)
  // assigned = Backlog, On Hold (upcoming)
  // starred = decision_required or pending review
  if (filters.scope === 'worked-on') {
    query = query.or('status.in.(Planned,In Progress),ready_for_sprint.eq.true');
  } else if (filters.scope === 'assigned') {
    query = query.in('status', ['Backlog', 'On Hold']);
  } else if (filters.scope === 'starred') {
    query = query.or('decision_required.eq.true,review_status.eq.pending');
  }

  // Apply status filter
  if (filters.status.length > 0) {
    query = query.in('status', filters.status as any);
  }

  // Apply priority filter
  if (filters.priority.length > 0) {
    query = query.in('priority', filters.priority as any);
  }

  // Apply search
  if (search && search.trim()) {
    query = query.or(`title.ilike.%${search}%,key.ilike.%${search}%`);
  }

  // Apply updated range
  if (updatedRangeDate) {
    query = query.gte('updated_at', updatedRangeDate.toISOString());
  }

  // Apply planner-specific filters
  if (filters.decisionRequired !== null) {
    query = query.eq('decision_required', filters.decisionRequired);
  }

  if (filters.readyForSprint !== null) {
    query = query.eq('ready_for_sprint', filters.readyForSprint);
  }

  if (filters.plannedDateFrom) {
    query = query.gte('planned_date', filters.plannedDateFrom);
  }

  if (filters.plannedDateTo) {
    query = query.lte('planned_date', filters.plannedDateTo);
  }

  // Apply sorting
  switch (sort) {
    case 'planned-date':
      query = query.order('planned_date', { ascending: true, nullsFirst: false });
      break;
    case 'priority':
      query = query.order('priority', { ascending: true });
      break;
    default:
      query = query.order('updated_at', { ascending: false });
      break;
  }

  query = query.range(from, to);

  const { data: tasks, count: totalCount, error } = await query;
  if (error) throw error;

  const items: UnifiedWorkItem[] = (tasks || []).map(task => {
    const key = task.key || `TSK-${task.id.slice(0, 6)}`;
    const context: WorkItemContext = {};
    return {
      id: task.id,
      key,
      summary: task.title,
      project: 'Work Manager',
      projectKey: 'WM',
      status: task.status,
      type: 'task' as WorkItemType,
      domain: 'planner' as HomeDomain,
      assignee: null, // No FK relationship to profiles - would need separate lookup
      activityDate: new Date(task.updated_at || task.created_at),
      activityType: 'Updated' as const,
      priority: task.priority,
      plannedDate: task.planned_date ? new Date(task.planned_date) : undefined,
      readyForSprint: task.ready_for_sprint || false,
      decisionRequired: task.decision_required || false,
      reviewStatus: task.review_status || 'none',
      blocked: task.blocked || false,
      nav: generateNavigation('planner', 'task', task.id, key, context),
      context,
    };
  });

  // Fetch category counts
  const [plannedResult, upcomingResult, pendingResult] = await Promise.all([
    supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
      .or('status.in.(Planned,In Progress),ready_for_sprint.eq.true'),
    supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
      .in('status', ['Backlog', 'On Hold']),
    supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
      .or('decision_required.eq.true,review_status.eq.pending'),
  ]);

  return {
    items,
    counts: {
      workedOn: plannedResult.count || 0,
      assigned: upcomingResult.count || 0,
      starred: pendingResult.count || 0,
      total: totalCount || 0,
    },
    pagination: {
      page,
      pageSize,
      total: totalCount || 0,
      hasMore: from + pageSize < (totalCount || 0),
    },
  };
}
