// src/hooks/home/useHomeWorkItems.ts
// UNIFIED HOME WORK ITEMS HOOK - Single source of truth for all domains
// Implements: Operations (Incidents), Delivery (Epics/Features/Stories), Planner (Tasks)

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';
import { useCallback, useEffect, useMemo } from 'react';

// ============================================
// TYPES
// ============================================
export type HomeDomain = 'all' | 'operations' | 'delivery' | 'planner';
export type HomeScope = 'worked-on' | 'assigned' | 'starred';
export type HomeSort = 'updated' | 'priority' | 'status' | 'planned-date';

export interface HomeFiltersState {
  status: string[];
  priority: string[];
  updatedRange: '24h' | '7d' | '30d' | 'any';
  projectIds: string[];
  // Planner-specific
  decisionRequired: boolean | null;
  readyForSprint: boolean | null;
  plannedDateFrom: string | null;
  plannedDateTo: string | null;
}

export interface HomeWorkItemsParams {
  domain: HomeDomain;
  scope: HomeScope;
  search?: string;
  filters?: HomeFiltersState;
  sort?: HomeSort;
  page: number;
  pageSize: number;
  userId?: string;
}

export interface HomeWorkItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  status: string;
  type: WorkItemType;
  domain: HomeDomain;
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
  // Navigation
  navPath: string;
}

export interface HomeWorkItemsCounts {
  workedOn: number;
  assigned: number;
  starred: number;
  total: number;
}

export interface HomeWorkItemsPagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface HomeWorkItemsResponse {
  items: HomeWorkItem[];
  counts: HomeWorkItemsCounts;
  pagination: HomeWorkItemsPagination;
}

// ============================================
// HELPERS
// ============================================
function getUpdatedRangeDate(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default: return null;
  }
}

function createQueryKey(params: HomeWorkItemsParams): (string | number | object)[] {
  return [
    'home',
    'workItems',
    params.domain,
    params.scope,
    params.search || '',
    params.filters || {},
    params.sort || 'updated',
    params.page,
    params.pageSize,
    params.userId || '',
  ];
}

// ============================================
// FETCH OPERATIONS (INCIDENTS ONLY)
// ============================================
async function fetchOperations(params: {
  scope: HomeScope;
  search: string;
  filters: HomeFiltersState;
  sort: HomeSort;
  page: number;
  pageSize: number;
  updatedRangeDate: Date | null;
  userId?: string;
}): Promise<HomeWorkItemsResponse> {
  const { scope, search, filters, sort, page, pageSize, updatedRangeDate, userId } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

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

  // Scope filter
  if (scope === 'assigned' && userId) {
    query = query.eq('assignee_id', userId);
  }
  // Note: 'starred' scope requires a starred_items table - skip for now

  // Status filter
  if (filters.status.length > 0) {
    query = query.in('status', filters.status as any);
  }

  // Search
  if (search?.trim()) {
    query = query.or(`title.ilike.%${search}%,incident_key.ilike.%${search}%`);
  }

  // Updated range
  if (updatedRangeDate) {
    query = query.gte('updated_at', updatedRangeDate.toISOString());
  }

  // Sort
  if (sort === 'priority') {
    query = query.order('severity', { ascending: true });
  } else {
    query = query.order('updated_at', { ascending: false });
  }

  query = query.range(from, to);

  const { data: incidents, count, error } = await query;
  if (error) throw error;

  const items: HomeWorkItem[] = (incidents || []).map(inc => ({
    id: inc.id,
    key: inc.incident_key || `INC-${inc.id.slice(0, 6)}`,
    summary: inc.title,
    project: inc.project?.name || 'Unknown',
    projectKey: inc.project?.key || 'UNK',
    status: inc.status,
    type: 'defect' as WorkItemType,
    domain: 'operations' as HomeDomain,
    assignee: inc.assignee_id,
    activityDate: new Date(inc.updated_at || inc.created_at),
    activityType: 'Updated' as const,
    severity: inc.severity,
    navPath: `/release/incidents/${inc.id}`,
  }));

  // Get scope counts (server-side)
  const [workedOnRes, assignedRes] = await Promise.all([
    supabase.from('incidents').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('incidents').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
  ]);

  return {
    items,
    counts: {
      workedOn: workedOnRes.count || 0,
      assigned: assignedRes.count || 0,
      starred: 0,
      total: count || 0,
    },
    pagination: { page, pageSize, total: count || 0, hasMore: from + items.length < (count || 0) },
  };
}

// ============================================
// FETCH DELIVERY (EPICS/FEATURES/STORIES - NO TASKS, NO INCIDENTS)
// ============================================
async function fetchDelivery(params: {
  scope: HomeScope;
  search: string;
  filters: HomeFiltersState;
  sort: HomeSort;
  page: number;
  pageSize: number;
  updatedRangeDate: Date | null;
  userId?: string;
}): Promise<HomeWorkItemsResponse> {
  const { scope, search, filters, sort, page, pageSize, updatedRangeDate, userId } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const items: HomeWorkItem[] = [];
  let totalStories = 0;
  let totalFeatures = 0;
  let totalEpics = 0;

  // Fetch stories
  let storyQuery = supabase
    .from('stories')
    .select(`
      id, story_key, title, name, status, state, priority, assignee_id, blocked, created_at, updated_at,
      feature:features(id, name, display_id)
    `, { count: 'exact' })
    .is('deleted_at', null);

  if (scope === 'assigned' && userId) {
    storyQuery = storyQuery.eq('assignee_id', userId);
  }
  if (filters.status.length > 0) storyQuery = storyQuery.in('status', filters.status as any);
  if (filters.priority.length > 0) storyQuery = storyQuery.in('priority', filters.priority as any);
  if (search?.trim()) storyQuery = storyQuery.or(`title.ilike.%${search}%,story_key.ilike.%${search}%,name.ilike.%${search}%`);
  if (updatedRangeDate) storyQuery = storyQuery.gte('updated_at', updatedRangeDate.toISOString());
  storyQuery = sort === 'priority' 
    ? storyQuery.order('priority', { ascending: true }) 
    : storyQuery.order('updated_at', { ascending: false });
  storyQuery = storyQuery.range(from, to);

  const { data: stories, count: storyCount, error: storyErr } = await storyQuery;
  if (storyErr) throw storyErr;
  totalStories = storyCount || 0;

  (stories || []).forEach(s => {
    items.push({
      id: s.id,
      key: s.story_key || `US-${s.id.slice(0, 6)}`,
      summary: s.title || s.name || 'Untitled',
      project: s.feature?.name || 'Backlog',
      projectKey: s.feature?.display_id || 'BKL',
      status: s.status || s.state || 'Open',
      type: 'story' as WorkItemType,
      domain: 'delivery' as HomeDomain,
      assignee: s.assignee_id,
      activityDate: new Date(s.updated_at || s.created_at),
      activityType: 'Updated' as const,
      priority: s.priority,
      blocked: s.blocked,
      navPath: `/industry/backlog?focusKey=${encodeURIComponent(s.story_key || s.id)}`,
    });
  });

  // Fetch features (only for worked-on scope since features don't have assignees)
  if (scope === 'worked-on') {
    let featureQuery = supabase
      .from('features')
      .select(`
        id, display_id, name, status, priority, blocked, created_at, updated_at,
        epic:epics(id, name, epic_key)
      `, { count: 'exact' })
      .is('deleted_at', null);

    if (filters.status.length > 0) featureQuery = featureQuery.in('status', filters.status as any);
    if (filters.priority.length > 0) featureQuery = featureQuery.in('priority', filters.priority as any);
    if (search?.trim()) featureQuery = featureQuery.or(`name.ilike.%${search}%,display_id.ilike.%${search}%`);
    if (updatedRangeDate) featureQuery = featureQuery.gte('updated_at', updatedRangeDate.toISOString());
    featureQuery = sort === 'priority' 
      ? featureQuery.order('priority', { ascending: true }) 
      : featureQuery.order('updated_at', { ascending: false });
    featureQuery = featureQuery.range(from, to);

    const { data: features, count: featureCount, error: featureErr } = await featureQuery;
    if (featureErr) throw featureErr;
    totalFeatures = featureCount || 0;

    (features || []).forEach(f => {
      items.push({
        id: f.id,
        key: f.display_id || `F-${f.id.slice(0, 6)}`,
        summary: f.name,
        project: f.epic?.name || 'Portfolio',
        projectKey: f.epic?.epic_key || 'PRT',
        status: f.status || 'Open',
        type: 'feature' as WorkItemType,
        domain: 'delivery' as HomeDomain,
        assignee: null,
        activityDate: new Date(f.updated_at || f.created_at),
        activityType: 'Updated' as const,
        priority: f.priority,
        blocked: f.blocked,
        navPath: `/industry/backlog?focusKey=${encodeURIComponent(f.display_id || f.id)}`,
      });
    });

    // Fetch epics
    let epicQuery = supabase
      .from('epics')
      .select('id, epic_key, name, status, created_at, updated_at', { count: 'exact' })
      .is('deleted_at', null);

    if (search?.trim()) epicQuery = epicQuery.or(`name.ilike.%${search}%,epic_key.ilike.%${search}%`);
    if (updatedRangeDate) epicQuery = epicQuery.gte('updated_at', updatedRangeDate.toISOString());
    epicQuery = epicQuery.order('updated_at', { ascending: false }).range(from, to);

    const { data: epics, count: epicCount, error: epicErr } = await epicQuery;
    if (epicErr) throw epicErr;
    totalEpics = epicCount || 0;

    (epics || []).forEach(e => {
      items.push({
        id: e.id,
        key: e.epic_key || `E-${e.id.slice(0, 6)}`,
        summary: e.name,
        project: 'Portfolio',
        projectKey: 'PRT',
        status: e.status || 'Open',
        type: 'epic' as WorkItemType,
        domain: 'delivery' as HomeDomain,
        assignee: null,
        activityDate: new Date(e.updated_at || e.created_at),
        activityType: 'Updated' as const,
        navPath: `/industry/backlog?focusKey=${encodeURIComponent(e.epic_key || e.id)}`,
      });
    });
  }

  // Sort combined and trim
  items.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());
  const paginatedItems = items.slice(0, pageSize);

  // Get scope counts
  const [workedOnRes, assignedRes] = await Promise.all([
    supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
  ]);

  const total = totalStories + totalFeatures + totalEpics;

  return {
    items: paginatedItems,
    counts: {
      workedOn: (workedOnRes.count || 0) + totalFeatures + totalEpics,
      assigned: assignedRes.count || 0,
      starred: 0,
      total,
    },
    pagination: { page, pageSize, total, hasMore: from + paginatedItems.length < total },
  };
}

// ============================================
// FETCH PLANNER (TASKS ONLY)
// ============================================
async function fetchPlanner(params: {
  scope: HomeScope;
  search: string;
  filters: HomeFiltersState;
  sort: HomeSort;
  page: number;
  pageSize: number;
  updatedRangeDate: Date | null;
  userId?: string;
}): Promise<HomeWorkItemsResponse> {
  const { scope, search, filters, sort, page, pageSize, updatedRangeDate, userId } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('work_manager_tasks')
    .select(`
      id, key, title, status, priority, assignee_id, team_id, due_date, planned_date,
      ready_for_sprint, decision_required, review_status, blocked, created_at, updated_at
    `, { count: 'exact' });

  // Scope mapping for planner
  // worked-on = Planned/In Progress or ready_for_sprint
  // assigned = Backlog/On Hold
  // starred = decision_required or pending review
  if (scope === 'worked-on') {
    query = query.or('status.in.(Planned,In Progress),ready_for_sprint.eq.true');
  } else if (scope === 'assigned') {
    query = query.in('status', ['Backlog', 'On Hold']);
  } else if (scope === 'starred') {
    query = query.or('decision_required.eq.true,review_status.eq.pending');
  }

  if (filters.status.length > 0) query = query.in('status', filters.status as any);
  if (filters.priority.length > 0) query = query.in('priority', filters.priority as any);
  if (search?.trim()) query = query.or(`title.ilike.%${search}%,key.ilike.%${search}%`);
  if (updatedRangeDate) query = query.gte('updated_at', updatedRangeDate.toISOString());
  if (filters.decisionRequired !== null) query = query.eq('decision_required', filters.decisionRequired);
  if (filters.readyForSprint !== null) query = query.eq('ready_for_sprint', filters.readyForSprint);
  if (filters.plannedDateFrom) query = query.gte('planned_date', filters.plannedDateFrom);
  if (filters.plannedDateTo) query = query.lte('planned_date', filters.plannedDateTo);

  if (sort === 'planned-date') {
    query = query.order('planned_date', { ascending: true, nullsFirst: false });
  } else if (sort === 'priority') {
    query = query.order('priority', { ascending: true });
  } else {
    query = query.order('updated_at', { ascending: false });
  }

  query = query.range(from, to);

  const { data: tasks, count, error } = await query;
  if (error) throw error;

  const items: HomeWorkItem[] = (tasks || []).map(t => ({
    id: t.id,
    key: t.key || `TSK-${t.id.slice(0, 6)}`,
    summary: t.title,
    project: 'Work Manager',
    projectKey: 'WM',
    status: t.status,
    type: 'task' as WorkItemType,
    domain: 'planner' as HomeDomain,
    assignee: t.assignee_id,
    activityDate: new Date(t.updated_at || t.created_at),
    activityType: 'Updated' as const,
    priority: t.priority,
    plannedDate: t.planned_date ? new Date(t.planned_date) : undefined,
    readyForSprint: t.ready_for_sprint || false,
    decisionRequired: t.decision_required || false,
    reviewStatus: t.review_status || 'none',
    blocked: t.blocked || false,
    navPath: `/planner/tasks?taskId=${t.id}`,
  }));

  // Get scope counts
  const [plannedRes, upcomingRes, pendingRes] = await Promise.all([
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
      workedOn: plannedRes.count || 0,
      assigned: upcomingRes.count || 0,
      starred: pendingRes.count || 0,
      total: count || 0,
    },
    pagination: { page, pageSize, total: count || 0, hasMore: from + items.length < (count || 0) },
  };
}

// ============================================
// FETCH ALL (COMBINED DOMAINS)
// ============================================
async function fetchAll(params: {
  scope: HomeScope;
  search: string;
  filters: HomeFiltersState;
  sort: HomeSort;
  page: number;
  pageSize: number;
  updatedRangeDate: Date | null;
  userId?: string;
}): Promise<HomeWorkItemsResponse> {
  const { page, pageSize } = params;
  
  // Fetch from all three domains
  const [opsRes, deliveryRes, plannerRes] = await Promise.all([
    fetchOperations(params),
    fetchDelivery(params),
    fetchPlanner(params),
  ]);

  // Combine items
  let allItems = [...opsRes.items, ...deliveryRes.items, ...plannerRes.items];

  // Sort combined
  if (params.sort === 'priority') {
    const priorityOrder = { 'Critical': 0, 'SEV1': 0, 'High': 1, 'SEV2': 1, 'Medium': 2, 'SEV3': 2, 'Low': 3, 'SEV4': 3 };
    allItems.sort((a, b) => {
      const aOrder = priorityOrder[(a.priority || a.severity) as keyof typeof priorityOrder] ?? 4;
      const bOrder = priorityOrder[(b.priority || b.severity) as keyof typeof priorityOrder] ?? 4;
      return aOrder - bOrder;
    });
  } else {
    allItems.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());
  }

  // Paginate combined results
  const from = (page - 1) * pageSize;
  const paginatedItems = allItems.slice(from, from + pageSize);
  const totalCount = opsRes.counts.total + deliveryRes.counts.total + plannerRes.counts.total;

  return {
    items: paginatedItems,
    counts: {
      workedOn: opsRes.counts.workedOn + deliveryRes.counts.workedOn + plannerRes.counts.workedOn,
      assigned: opsRes.counts.assigned + deliveryRes.counts.assigned + plannerRes.counts.assigned,
      starred: opsRes.counts.starred + deliveryRes.counts.starred + plannerRes.counts.starred,
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
// MAIN HOOK
// ============================================
export function useHomeWorkItems(params: HomeWorkItemsParams) {
  const queryClient = useQueryClient();
  const { domain, scope, search = '', filters, sort = 'updated', page, pageSize, userId } = params;

  const defaultFilters: HomeFiltersState = {
    status: [],
    priority: [],
    updatedRange: 'any',
    projectIds: [],
    decisionRequired: null,
    readyForSprint: null,
    plannedDateFrom: null,
    plannedDateTo: null,
  };

  const effectiveFilters = filters || defaultFilters;
  const updatedRangeDate = getUpdatedRangeDate(effectiveFilters.updatedRange);
  const queryKey = createQueryKey(params);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<HomeWorkItemsResponse> => {
      const fetchParams = {
        scope,
        search,
        filters: effectiveFilters,
        sort,
        page,
        pageSize,
        updatedRangeDate,
        userId,
      };

      switch (domain) {
        case 'all': return fetchAll(fetchParams);
        case 'operations': return fetchOperations(fetchParams);
        case 'delivery': return fetchDelivery(fetchParams);
        case 'planner': return fetchPlanner(fetchParams);
        default: return { items: [], counts: { workedOn: 0, assigned: 0, starred: 0, total: 0 }, pagination: { page, pageSize, total: 0, hasMore: false } };
      }
    },
    // CRITICAL: Zero stale time for instant refresh
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Cancel previous queries when domain/scope/filters change
  const cancelAndRefetch = useCallback(() => {
    queryClient.cancelQueries({ queryKey: ['home', 'workItems'] });
    query.refetch();
  }, [queryClient, query]);

  return {
    ...query,
    cancelAndRefetch,
  };
}

// ============================================
// INVALIDATION HELPER
// ============================================
export function useHomeWorkItemsInvalidation() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['home', 'workItems'] });
  }, [queryClient]);
}
