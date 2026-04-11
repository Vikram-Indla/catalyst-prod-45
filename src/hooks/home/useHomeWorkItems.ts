// src/hooks/home/useHomeWorkItems.ts
// UNIFIED HOME WORK ITEMS HOOK - Single source of truth for all domains
// Domain rules:
// - Operations = Incidents ONLY
// - Planner = Tasks ONLY (Work Manager tasks)  
// - Delivery = Everything EXCEPT incidents and tasks (Epics/Features/Stories)

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';
import { useCallback, useEffect, useMemo } from 'react';

// ============================================
// TYPES
// ============================================
export type HomeDomain = 'all' | 'operations' | 'delivery' | 'planner';
export type HomeScope = 'worked-on' | 'assigned' | 'starred';
export type HomeSort = 'updated' | 'priority' | 'status' | 'planned-date' | 'key' | 'level' | 'assignee';

export interface HomeFiltersState {
  status: string[];
  priority: string[];
  updatedRange: '24h' | '7d' | '30d' | 'any';
  projectIds: string[];
  // New filters for Assignee and Level
  assignee: string[];
  level: string[];
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

// Level hierarchy for navigation menu context
export type HomeLevel = 'Enterprise' | 'Product' | 'Program' | 'Project' | 'Release' | 'Planner';

export interface HomeWorkItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  level: HomeLevel; // Nav menu level: Enterprise, Product, Program, Project, Release, Planner
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
// FETCH STARRED ITEMS (from user_starred_items table)
// ============================================
async function fetchStarredItems(params: {
  domain: HomeDomain;
  search: string;
  filters: HomeFiltersState;
  sort: HomeSort;
  page: number;
  pageSize: number;
  userId?: string;
}): Promise<HomeWorkItemsResponse> {
  const { domain, search, sort, page, pageSize, userId } = params;
  const from = (page - 1) * pageSize;

  if (!userId) {
    return {
      items: [],
      counts: { workedOn: 0, assigned: 0, starred: 0, total: 0 },
      pagination: { page, pageSize, total: 0, hasMore: false },
    };
  }

  // Get starred items for this user
  const { data: starredItems, error: starredError } = await supabase
    .from('user_starred_items')
    .select('item_id, item_type, starred_at')
    .eq('user_id', userId)
    .order('starred_at', { ascending: false });

  if (starredError) throw starredError;
  if (!starredItems || starredItems.length === 0) {
    return {
      items: [],
      counts: { workedOn: 0, assigned: 0, starred: 0, total: 0 },
      pagination: { page, pageSize, total: 0, hasMore: false },
    };
  }

  // Filter by domain
  const domainTypeMap: Record<HomeDomain, string[]> = {
    all: ['epic', 'feature', 'story', 'task', 'incident', 'defect'],
    operations: ['incident', 'defect'],
    delivery: ['epic', 'feature', 'story'],
    planner: ['task'],
  };
  const allowedTypes = domainTypeMap[domain];
  const filteredStarred = starredItems.filter(s => allowedTypes.includes(s.item_type));

  if (filteredStarred.length === 0) {
    return {
      items: [],
      counts: { workedOn: 0, assigned: 0, starred: starredItems.length, total: 0 },
      pagination: { page, pageSize, total: 0, hasMore: false },
    };
  }

  // Group by type for efficient fetching
  const storyIds = filteredStarred.filter(s => s.item_type === 'story').map(s => s.item_id);
  const featureIds = filteredStarred.filter(s => s.item_type === 'feature').map(s => s.item_id);
  const epicIds = filteredStarred.filter(s => s.item_type === 'epic').map(s => s.item_id);
  const taskIds = filteredStarred.filter(s => s.item_type === 'task').map(s => s.item_id);
  const incidentIds = filteredStarred.filter(s => s.item_type === 'incident' || s.item_type === 'defect').map(s => s.item_id);

  const items: HomeWorkItem[] = [];

  // Fetch stories
  if (storyIds.length > 0) {
    const { data: stories } = await supabase
      .from('stories')
      .select('id, story_key, title, name, status, state, priority, assignee_id, blocked, updated_at, created_at, feature:features(id, name, display_id, project_id)')
      .in('id', storyIds)
      .is('deleted_at', null);

    const assigneeIds = (stories || []).map(s => s.assignee_id).filter(Boolean);
    const { data: profiles } = assigneeIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    (stories || []).forEach(s => {
      const starredItem = filteredStarred.find(st => st.item_id === s.id);
      const storyKey = s.story_key || `US-${s.id.slice(0, 6)}`;
      items.push({
        id: s.id,
        key: storyKey,
        summary: s.title || s.name || 'Untitled',
        project: s.feature?.name || 'Backlog',
        projectKey: s.feature?.display_id || 'BKL',
        level: 'Project' as HomeLevel,
        status: s.status || s.state || 'Open',
        type: 'story' as WorkItemType,
        domain: 'delivery' as HomeDomain,
        assignee: s.assignee_id ? profileMap.get(s.assignee_id) || null : null,
        activityDate: new Date(starredItem?.starred_at || s.updated_at || s.created_at),
        activityType: 'Updated' as const,
        priority: s.priority,
        blocked: s.blocked,
        navPath: s.feature?.project_id
          ? `/projects/${s.feature.project_id}/work?focusKey=${encodeURIComponent(storyKey)}`
          : `/industry/backlog?focusKey=${encodeURIComponent(storyKey)}`,
      });
    });
  }

  // Fetch features
  if (featureIds.length > 0) {
    const { data: features } = await supabase
      .from('features')
      .select('id, display_id, name, status, priority, blocked, updated_at, created_at, project_id, assignee_id, epic:epics(id, name, epic_key)')
      .in('id', featureIds)
      .is('deleted_at', null);

    const assigneeIds = (features || []).map(f => f.assignee_id).filter(Boolean);
    const { data: profiles } = assigneeIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds as string[])
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    (features || []).forEach(f => {
      const starredItem = filteredStarred.find(st => st.item_id === f.id);
      const featureKey = f.display_id || `F-${f.id.slice(0, 6)}`;
      items.push({
        id: f.id,
        key: featureKey,
        summary: f.name,
        project: f.epic?.name || 'Portfolio',
        projectKey: f.epic?.epic_key || 'PRT',
        level: 'Program' as HomeLevel,
        status: f.status || 'Open',
        type: 'feature' as WorkItemType,
        domain: 'delivery' as HomeDomain,
        assignee: f.assignee_id ? profileMap.get(f.assignee_id) || null : null,
        activityDate: new Date(starredItem?.starred_at || f.updated_at || f.created_at),
        activityType: 'Updated' as const,
        priority: f.priority,
        blocked: f.blocked,
        navPath: f.project_id ? `/projects/${f.project_id}/features/${f.id}` : `/features`,
      });
    });
  }

  // Fetch epics
  if (epicIds.length > 0) {
    const { data: epics } = await supabase
      .from('epics')
      .select('id, epic_key, name, status, assignee_id, updated_at, created_at')
      .in('id', epicIds)
      .is('deleted_at', null);

    const assigneeIds = (epics || []).map(e => e.assignee_id).filter(Boolean);
    const { data: profiles } = assigneeIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds as string[])
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    (epics || []).forEach(e => {
      const starredItem = filteredStarred.find(st => st.item_id === e.id);
      items.push({
        id: e.id,
        key: e.epic_key || `E-${e.id.slice(0, 6)}`,
        summary: e.name,
        project: 'Portfolio',
        projectKey: 'PRT',
        level: 'Product' as HomeLevel,
        status: e.status || 'Open',
        type: 'epic' as WorkItemType,
        domain: 'delivery' as HomeDomain,
        assignee: e.assignee_id ? profileMap.get(e.assignee_id) || null : null,
        activityDate: new Date(starredItem?.starred_at || e.updated_at || e.created_at),
        activityType: 'Updated' as const,
        navPath: `/industry/backlog?focusKey=${encodeURIComponent(e.epic_key || e.id)}`,
      });
    });
  }

  // Fetch tasks
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from('work_manager_tasks')
      .select('id, key, title, status, priority, blocked, updated_at, created_at, assignee_id, planned_date, ready_for_sprint, decision_required, review_status')
      .in('id', taskIds);

    const assigneeIds = (tasks || []).map(t => t.assignee_id).filter(Boolean);
    const { data: profiles } = assigneeIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    (tasks || []).forEach(t => {
      const starredItem = filteredStarred.find(st => st.item_id === t.id);
      items.push({
        id: t.id,
        key: t.key || `TSK-${t.id.slice(0, 6)}`,
        summary: t.title || 'Untitled Task',
        project: 'Work Manager',
        projectKey: 'WM',
        level: 'Planner' as HomeLevel,
        status: t.status || 'Open',
        type: 'task' as WorkItemType,
        domain: 'planner' as HomeDomain,
        assignee: t.assignee_id ? profileMap.get(t.assignee_id) || null : null,
        activityDate: new Date(starredItem?.starred_at || t.updated_at || t.created_at),
        activityType: 'Updated' as const,
        priority: t.priority,
        blocked: t.blocked || false,
        plannedDate: t.planned_date ? new Date(t.planned_date) : undefined,
        readyForSprint: t.ready_for_sprint || false,
        decisionRequired: t.decision_required || false,
        reviewStatus: t.review_status || 'none',
        navPath: `/taskhub/tasks?taskId=${t.id}`,
      });
    });
  }

  // Fetch incidents
  if (incidentIds.length > 0) {
    const { data: incidents } = await supabase
      .from('incidents')
      .select('id, incident_key, title, status, severity, assignee_id, updated_at, created_at, project:projects!incidents_project_id_fkey(id, name, key)')
      .in('id', incidentIds)
      .is('deleted_at', null);

    const assigneeIds = (incidents || []).map(i => i.assignee_id).filter(Boolean);
    const { data: profiles } = assigneeIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    (incidents || []).forEach(inc => {
      const starredItem = filteredStarred.find(st => st.item_id === inc.id);
      items.push({
        id: inc.id,
        key: inc.incident_key || `INC-${inc.id.slice(0, 6)}`,
        summary: inc.title,
        project: inc.project?.name || 'Unknown',
        projectKey: inc.project?.key || 'UNK',
        level: 'Release' as HomeLevel,
        status: inc.status,
        type: 'defect' as WorkItemType,
        domain: 'operations' as HomeDomain,
        assignee: inc.assignee_id ? profileMap.get(inc.assignee_id) || null : null,
        activityDate: new Date(starredItem?.starred_at || inc.updated_at || inc.created_at),
        activityType: 'Updated' as const,
        severity: inc.severity,
        navPath: `/release/incidents/${inc.id}`,
      });
    });
  }

  // Apply search filter
  let filteredItems = items;
  if (search?.trim()) {
    const searchLower = search.toLowerCase();
    filteredItems = items.filter(item =>
      item.summary.toLowerCase().includes(searchLower) ||
      item.key.toLowerCase().includes(searchLower)
    );
  }

  // Sort by starred_at (most recent first) - activityDate is set to starred_at
  if (sort === 'priority') {
    const priorityOrder = { 'Critical': 0, 'SEV1': 0, 'High': 1, 'SEV2': 1, 'Medium': 2, 'SEV3': 2, 'Low': 3, 'SEV4': 3 };
    filteredItems.sort((a, b) => {
      const aOrder = priorityOrder[(a.priority || a.severity) as keyof typeof priorityOrder] ?? 4;
      const bOrder = priorityOrder[(b.priority || b.severity) as keyof typeof priorityOrder] ?? 4;
      return aOrder - bOrder;
    });
  } else {
    filteredItems.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());
  }

  // Paginate
  const total = filteredItems.length;
  const paginatedItems = filteredItems.slice(from, from + pageSize);

  return {
    items: paginatedItems,
    counts: {
      workedOn: 0, // Will be filled by the caller
      assigned: 0,
      starred: starredItems.length, // Total starred items count (all types)
      total,
    },
    pagination: { page, pageSize, total, hasMore: from + paginatedItems.length < total },
  };
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

  // Use limit instead of range to avoid 416 errors, then paginate client-side
  query = query.limit(500);

  const { data: incidents, count, error } = await query;
  if (error) throw error;

  // Fetch assignee names
  const assigneeIds = (incidents || []).map(i => i.assignee_id).filter(Boolean);
  const { data: profiles } = assigneeIds.length > 0 
    ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
    : { data: [] };
  const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

  const allItems: HomeWorkItem[] = (incidents || []).map(inc => ({
    id: inc.id,
    key: inc.incident_key || `INC-${inc.id.slice(0, 6)}`,
    summary: inc.title,
    project: inc.project?.name || 'Unknown',
    projectKey: inc.project?.key || 'UNK',
    level: 'Release' as HomeLevel, // Incidents are at Release level
    status: inc.status,
    type: 'defect' as WorkItemType,
    domain: 'operations' as HomeDomain,
    assignee: inc.assignee_id ? profileMap.get(inc.assignee_id) || null : null,
    activityDate: new Date(inc.updated_at || inc.created_at),
    activityType: 'Updated' as const,
    severity: inc.severity,
    navPath: `/release/incidents/${inc.id}`,
  }));

  // Client-side pagination
  const total = allItems.length;
  const paginatedItems = allItems.slice(from, from + pageSize);

  // Get scope counts (server-side)
  const [workedOnRes, assignedRes] = await Promise.all([
    supabase.from('incidents').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('incidents').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
  ]);

  return {
    items: paginatedItems,
    counts: {
      workedOn: workedOnRes.count || 0,
      assigned: assignedRes.count || 0,
      starred: 0,
      total,
    },
    pagination: { page, pageSize, total, hasMore: from + paginatedItems.length < total },
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

  const items: HomeWorkItem[] = [];
  let totalStories = 0;
  let totalFeatures = 0;
  let totalEpics = 0;

  // Fetch stories - get count first, then fetch all for proper client-side pagination
  let storyQuery = supabase
    .from('stories')
    .select(`
      id, story_key, title, name, status, state, priority, assignee_id, blocked, created_at, updated_at,
      feature:features(id, name, display_id, project_id)
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
  // Limit to reasonable max for combined pagination
  storyQuery = storyQuery.limit(500);

  const { data: stories, count: storyCount, error: storyErr } = await storyQuery;
  if (storyErr) throw storyErr;
  totalStories = storyCount || 0;

  // Fetch assignee names for stories
  const storyAssigneeIds = (stories || []).map(s => s.assignee_id).filter(Boolean);
  const { data: storyProfiles } = storyAssigneeIds.length > 0 
    ? await supabase.from('profiles').select('id, full_name').in('id', storyAssigneeIds)
    : { data: [] };
  const storyProfileMap = new Map((storyProfiles || []).map(p => [p.id, p.full_name]));

  (stories || []).forEach(s => {
    const storyKey = s.story_key || `US-${s.id.slice(0, 6)}`;
    items.push({
      id: s.id,
      key: storyKey,
      summary: s.title || s.name || 'Untitled',
      project: s.feature?.name || 'Backlog',
      projectKey: s.feature?.display_id || 'BKL',
      level: 'Project' as HomeLevel, // Stories are at Project level
      status: s.status || s.state || 'Open',
      type: 'story' as WorkItemType,
      domain: 'delivery' as HomeDomain,
      assignee: s.assignee_id ? storyProfileMap.get(s.assignee_id) || null : null,
      activityDate: new Date(s.updated_at || s.created_at),
      activityType: 'Updated' as const,
      priority: s.priority,
      blocked: s.blocked,
      navPath: s.feature?.project_id
        ? `/projects/${s.feature.project_id}/work?focusKey=${encodeURIComponent(storyKey)}`
        : `/industry/backlog?focusKey=${encodeURIComponent(storyKey)}`,
    });
  });

  // Fetch features + epics for worked-on and assigned scopes
  // - worked-on: show all recent items
  // - assigned: show only items assigned to the current user
  if (scope === 'worked-on' || scope === 'assigned') {
    // ------------------------------
    // Features
    // ------------------------------
    let featureQuery = supabase
      .from('features')
      .select(`
        id, display_id, name, status, priority, blocked, created_at, updated_at, project_id, assignee_id,
        epic:epics(id, name, epic_key)
      `, { count: 'exact' })
      .is('deleted_at', null);

    if (scope === 'assigned' && userId) {
      featureQuery = featureQuery.eq('assignee_id', userId);
    }

    if (filters.status.length > 0) featureQuery = featureQuery.in('status', filters.status as any);
    if (filters.priority.length > 0) featureQuery = featureQuery.in('priority', filters.priority as any);
    if (search?.trim()) featureQuery = featureQuery.or(`name.ilike.%${search}%,display_id.ilike.%${search}%`);
    if (updatedRangeDate) featureQuery = featureQuery.gte('updated_at', updatedRangeDate.toISOString());
    featureQuery = sort === 'priority'
      ? featureQuery.order('priority', { ascending: true })
      : featureQuery.order('updated_at', { ascending: false });
    featureQuery = featureQuery.limit(500);

    const { data: features, count: featureCount, error: featureErr } = await featureQuery;
    if (featureErr) throw featureErr;
    totalFeatures = featureCount || 0;

    // Assignee names for features
    const featureAssigneeIds = (features || []).map(f => f.assignee_id).filter(Boolean);
    const { data: featureProfiles } = featureAssigneeIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', featureAssigneeIds as string[])
      : { data: [] };
    const featureProfileMap = new Map((featureProfiles || []).map(p => [p.id, p.full_name]));

    (features || []).forEach(f => {
      const featureKey = f.display_id || `F-${f.id.slice(0, 6)}`;
      items.push({
        id: f.id,
        key: featureKey,
        summary: f.name,
        project: f.epic?.name || 'Portfolio',
        projectKey: f.epic?.epic_key || 'PRT',
        level: 'Program' as HomeLevel,
        status: f.status || 'Open',
        type: 'feature' as WorkItemType,
        domain: 'delivery' as HomeDomain,
        assignee: f.assignee_id ? featureProfileMap.get(f.assignee_id) || null : null,
        activityDate: new Date(f.updated_at || f.created_at),
        activityType: 'Updated' as const,
        priority: f.priority,
        blocked: f.blocked,
        navPath: f.project_id ? `/projects/${f.project_id}/features/${f.id}` : `/features`,
      });
    });

    // ------------------------------
    // Epics
    // ------------------------------
    let epicQuery = supabase
      .from('epics')
      .select('id, epic_key, name, status, assignee_id, created_at, updated_at', { count: 'exact' })
      .is('deleted_at', null);

    if (scope === 'assigned' && userId) {
      epicQuery = epicQuery.eq('assignee_id', userId);
    }

    if (search?.trim()) epicQuery = epicQuery.or(`name.ilike.%${search}%,epic_key.ilike.%${search}%`);
    if (updatedRangeDate) epicQuery = epicQuery.gte('updated_at', updatedRangeDate.toISOString());
    epicQuery = epicQuery.order('updated_at', { ascending: false }).limit(500);

    const { data: epics, count: epicCount, error: epicErr } = await epicQuery;
    if (epicErr) throw epicErr;
    totalEpics = epicCount || 0;

    // Fetch assignee names for epics
    const epicAssigneeIds = (epics || []).map(e => e.assignee_id).filter(Boolean);
    const { data: epicProfiles } = epicAssigneeIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', epicAssigneeIds as string[])
      : { data: [] };
    const epicProfileMap = new Map((epicProfiles || []).map(p => [p.id, p.full_name]));

    (epics || []).forEach(e => {
      items.push({
        id: e.id,
        key: e.epic_key || `E-${e.id.slice(0, 6)}`,
        summary: e.name,
        project: 'Portfolio',
        projectKey: 'PRT',
        level: 'Product' as HomeLevel,
        status: e.status || 'Open',
        type: 'epic' as WorkItemType,
        domain: 'delivery' as HomeDomain,
        assignee: e.assignee_id ? epicProfileMap.get(e.assignee_id) || null : null,
        activityDate: new Date(e.updated_at || e.created_at),
        activityType: 'Updated' as const,
        navPath: `/industry/backlog?focusKey=${encodeURIComponent(e.epic_key || e.id)}`,
      });
    });
  }

  // Sort combined items
  items.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());
  
  // Client-side pagination on the combined results
  const total = items.length;
  const paginatedItems = items.slice(from, from + pageSize);

  // Get scope counts
  const [storiesTotalRes, storiesAssignedRes, featuresAssignedRes, epicsAssignedRes] = await Promise.all([
    supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('stories').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('assignee_id', 'is', null),
    userId
      ? supabase.from('features').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('assignee_id', userId)
      : Promise.resolve({ count: 0 } as any),
    userId
      ? supabase.from('epics').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('assignee_id', userId)
      : Promise.resolve({ count: 0 } as any),
  ]);

  return {
    items: paginatedItems,
    counts: {
      workedOn: (storiesTotalRes.count || 0) + totalFeatures + totalEpics,
      assigned: (storiesAssignedRes.count || 0) + (featuresAssignedRes.count || 0) + (epicsAssignedRes.count || 0),
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

  // Use limit instead of range to avoid 416 errors
  query = query.limit(500);

  const { data: tasks, count, error } = await query;
  if (error) throw error;
  
  // Fetch assignee names for tasks
  const taskAssigneeIds = (tasks || []).map(t => t.assignee_id).filter(Boolean);
  const { data: taskProfiles } = taskAssigneeIds.length > 0 
    ? await supabase.from('profiles').select('id, full_name').in('id', taskAssigneeIds)
    : { data: [] };
  const taskProfileMap = new Map((taskProfiles || []).map(p => [p.id, p.full_name]));

  const allItems: HomeWorkItem[] = (tasks || []).map(t => ({
    id: t.id,
    key: t.key || `TSK-${t.id.slice(0, 6)}`,
    summary: t.title,
    project: 'Work Manager',
    projectKey: 'WM',
    level: 'Planner' as HomeLevel, // Tasks are at Planner level
    status: t.status,
    type: 'task' as WorkItemType,
    domain: 'planner' as HomeDomain,
    assignee: t.assignee_id ? taskProfileMap.get(t.assignee_id) || null : null,
    activityDate: new Date(t.updated_at || t.created_at),
    activityType: 'Updated' as const,
    priority: t.priority,
    plannedDate: t.planned_date ? new Date(t.planned_date) : undefined,
    readyForSprint: t.ready_for_sprint || false,
    decisionRequired: t.decision_required || false,
    reviewStatus: t.review_status || 'none',
    blocked: t.blocked || false,
    navPath: `/taskhub/tasks?taskId=${t.id}`,
  }));

  // Client-side pagination
  const total = allItems.length;
  const paginatedItems = allItems.slice(from, from + pageSize);

  // Get scope counts - dynamic real-time counts
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfThisWeek = new Date(startOfToday);
  endOfThisWeek.setDate(startOfToday.getDate() + (7 - startOfToday.getDay())); // End of this week (Sunday)
  const startOfNextWeek = new Date(endOfThisWeek);
  startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

  const [assignedToMeRes, thisWeekRes, nextWeekRes] = await Promise.all([
    // Assigned to me - tasks assigned to current user
    userId 
      ? supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
          .eq('assignee_id', userId)
      : Promise.resolve({ count: 0 }),
    // This week - tasks with due_date within this week
    supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
      .gte('due_date', startOfToday.toISOString().split('T')[0])
      .lte('due_date', endOfThisWeek.toISOString().split('T')[0]),
    // Next week - tasks with due_date in next week
    supabase.from('work_manager_tasks').select('id', { count: 'exact', head: true })
      .gte('due_date', startOfNextWeek.toISOString().split('T')[0])
      .lte('due_date', endOfNextWeek.toISOString().split('T')[0]),
  ]);

  return {
    items: paginatedItems,
    counts: {
      workedOn: assignedToMeRes.count || 0, // Assigned to me
      assigned: thisWeekRes.count || 0,     // This week
      starred: nextWeekRes.count || 0,      // Next week
      total,
    },
    pagination: { page, pageSize, total, hasMore: from + paginatedItems.length < total },
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

  // IMPORTANT:
  // Each domain fetch already paginates. In "all" mode we must fetch the FULL
  // (bounded) result sets from each domain and paginate only once after combining.
  const combinedFetchParams = {
    ...params,
    page: 1,
    pageSize: 500,
  };

  // Fetch from all three domains (unpaginated within the 500-item bound)
  const [opsRes, deliveryRes, plannerRes] = await Promise.all([
    fetchOperations(combinedFetchParams),
    fetchDelivery(combinedFetchParams),
    fetchPlanner(combinedFetchParams),
  ]);

  // Combine items
  const allItems = [...opsRes.items, ...deliveryRes.items, ...plannerRes.items];

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
    assignee: [],
    level: [],
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
      // STARRED SCOPE: Always fetch from user_starred_items table
      if (scope === 'starred') {
        // Get current user if not provided
        let effectiveUserId = userId;
        if (!effectiveUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          effectiveUserId = user?.id;
        }
        
        const starredResult = await fetchStarredItems({
          domain,
          search,
          filters: effectiveFilters,
          sort,
          page,
          pageSize,
          userId: effectiveUserId,
        });

        // Get other scope counts for the tabs (workedOn, assigned)
        const fetchParams = {
          scope: 'worked-on' as HomeScope,
          search: '',
          filters: defaultFilters,
          sort,
          page: 1,
          pageSize: 1,
          updatedRangeDate: null,
          userId: effectiveUserId,
        };

        let workedOnCount = 0;
        let assignedCount = 0;

        try {
          switch (domain) {
            case 'all': {
              const allRes = await fetchAll({ ...fetchParams, scope: 'worked-on' });
              workedOnCount = allRes.counts.workedOn;
              const allAssigned = await fetchAll({ ...fetchParams, scope: 'assigned' });
              assignedCount = allAssigned.counts.assigned;
              break;
            }
            case 'operations': {
              const opsRes = await fetchOperations({ ...fetchParams, scope: 'worked-on' });
              workedOnCount = opsRes.counts.workedOn;
              assignedCount = opsRes.counts.assigned;
              break;
            }
            case 'delivery': {
              const delRes = await fetchDelivery({ ...fetchParams, scope: 'worked-on' });
              workedOnCount = delRes.counts.workedOn;
              assignedCount = delRes.counts.assigned;
              break;
            }
            case 'planner': {
              const planRes = await fetchPlanner({ ...fetchParams, scope: 'worked-on' });
              workedOnCount = planRes.counts.workedOn;
              assignedCount = planRes.counts.assigned;
              break;
            }
          }
        } catch (e) {
          // Ignore count errors
        }

        return {
          ...starredResult,
          counts: {
            workedOn: workedOnCount,
            assigned: assignedCount,
            starred: starredResult.counts.starred,
            total: starredResult.pagination.total,
          },
        };
      }

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
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
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
