// src/hooks/home/useHomePlannerData.ts
// Planner Mode: Work Manager (Planning & Work Management)
// Fully server-side filtering, sorting, and pagination

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItemType } from '@/components/ja/icons/WorkItemTypeIcon';

// ============================================
// TYPES
// ============================================
export interface PlannerSummary {
  planned: number;
  upcoming: number;
  pendingReview: number;
}

export interface PlannerWorkItem {
  id: string;
  key: string;
  summary: string;
  project: string;
  projectKey: string;
  status: string;
  type: WorkItemType;
  assignee: string | null;
  activityDate: Date;
  activityType: 'Updated' | 'Created';
  priority?: string;
  plannedDate?: Date;
  readyForSprint?: boolean;
  decisionRequired?: boolean;
  reviewStatus?: string;
  blocked?: boolean;
}

export interface PlannerFilters {
  status: string[];
  decisionRequired: boolean | null;
  readyForSprint: boolean | null;
  plannedDateFrom: string | null;
  plannedDateTo: string | null;
}

export interface PlannerItemsParams {
  category?: 'planned' | 'upcoming' | 'pending-review';
  search?: string;
  sort?: 'updated' | 'planned-date' | 'priority';
  filters?: PlannerFilters;
  page?: number;
  pageSize?: number;
  userId?: string;
}

export interface PlannerPagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface PlannerItemsResponse {
  items: PlannerWorkItem[];
  counts: {
    planned: number;
    upcoming: number;
    pendingReview: number;
  };
  pagination: PlannerPagination;
}

// Category to status mapping for Work Manager tasks
const CATEGORY_MAPPINGS = {
  // Planned: tasks that are actively being worked on or ready for sprint
  planned: {
    statuses: ['Planned', 'In Progress'],
    readyForSprint: true,
  },
  // Upcoming: tasks in backlog or on hold, not yet ready
  upcoming: {
    statuses: ['Backlog', 'On Hold'],
    readyForSprint: false,
  },
  // Pending Review: tasks needing decision or in review
  pendingReview: {
    decisionRequired: true,
    reviewStatuses: ['pending'],
  },
};

// ============================================
// SUMMARY HOOK - Fetches counts for all categories
// ============================================
export function useHomePlannerSummary(userId?: string) {
  return useQuery({
    queryKey: ['home-planner-summary', userId],
    queryFn: async (): Promise<PlannerSummary> => {
      // Count planned tasks (Planned, In Progress status OR ready_for_sprint = true)
      const { count: plannedCount } = await supabase
        .from('work_manager_tasks')
        .select('id', { count: 'exact', head: true })
        .or('status.in.(Planned,In Progress),ready_for_sprint.eq.true');

      // Count upcoming tasks (Backlog, On Hold status AND ready_for_sprint = false)
      const { count: upcomingCount } = await supabase
        .from('work_manager_tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['Backlog', 'On Hold'])
        .or('ready_for_sprint.is.null,ready_for_sprint.eq.false');

      // Count pending review tasks (decision_required = true OR review_status = pending)
      const { count: pendingReviewCount } = await supabase
        .from('work_manager_tasks')
        .select('id', { count: 'exact', head: true })
        .or('decision_required.eq.true,review_status.eq.pending');

      return {
        planned: plannedCount || 0,
        upcoming: upcomingCount || 0,
        pendingReview: pendingReviewCount || 0,
      };
    },
    staleTime: 1000 * 30,
  });
}

// ============================================
// ITEMS HOOK - Server-side filtering, sorting, pagination
// ============================================
export function useHomePlannerItems(params: PlannerItemsParams = {}) {
  const { 
    category, 
    search, 
    sort = 'updated', 
    filters,
    page = 1, 
    pageSize = 20,
    userId,
  } = params;

  return useQuery({
    queryKey: ['home-planner-items', category, search, sort, filters, page, pageSize, userId],
    queryFn: async (): Promise<PlannerItemsResponse> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build the query with all filters applied server-side
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

      // Apply category filter
      if (category === 'planned') {
        query = query.or('status.in.(Planned,In Progress),ready_for_sprint.eq.true');
      } else if (category === 'upcoming') {
        query = query.in('status', ['Backlog', 'On Hold']);
      } else if (category === 'pending-review') {
        query = query.or('decision_required.eq.true,review_status.eq.pending');
      }

      // Apply search filter (server-side)
      if (search && search.trim()) {
        query = query.or(`title.ilike.%${search}%,key.ilike.%${search}%`);
      }

      // Apply additional filters
      if (filters) {
        // Status filter
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }

        // Decision required filter
        if (filters.decisionRequired !== null) {
          query = query.eq('decision_required', filters.decisionRequired);
        }

        // Ready for sprint filter
        if (filters.readyForSprint !== null) {
          query = query.eq('ready_for_sprint', filters.readyForSprint);
        }

        // Planned date range filter
        if (filters.plannedDateFrom) {
          query = query.gte('planned_date', filters.plannedDateFrom);
        }
        if (filters.plannedDateTo) {
          query = query.lte('planned_date', filters.plannedDateTo);
        }
      }

      // Apply sorting
      switch (sort) {
        case 'planned-date':
          query = query.order('planned_date', { ascending: true, nullsFirst: false });
          break;
        case 'priority':
          // Priority order: High > Medium > Low
          query = query.order('priority', { ascending: true });
          break;
        case 'updated':
        default:
          query = query.order('updated_at', { ascending: false });
          break;
      }

      // Apply pagination
      query = query.range(from, to);

      const { data: tasks, count: totalCount, error } = await query;

      if (error) throw error;

      // Transform to PlannerWorkItem format
      const items: PlannerWorkItem[] = (tasks || []).map(task => ({
        id: task.id,
        key: task.key || `TSK-${task.id.slice(0, 6)}`,
        summary: task.title,
        project: 'Work Manager',
        projectKey: 'WM',
        status: task.status,
        type: 'task' as WorkItemType,
        assignee: task.assignee_id,
        activityDate: new Date(task.updated_at || task.created_at),
        activityType: 'Updated',
        priority: task.priority,
        plannedDate: task.planned_date ? new Date(task.planned_date) : undefined,
        readyForSprint: task.ready_for_sprint || false,
        decisionRequired: task.decision_required || false,
        reviewStatus: task.review_status || 'none',
        blocked: task.blocked || false,
      }));

      // Fetch category counts in parallel for accurate tab counts
      const [plannedResult, upcomingResult, pendingReviewResult] = await Promise.all([
        supabase
          .from('work_manager_tasks')
          .select('id', { count: 'exact', head: true })
          .or('status.in.(Planned,In Progress),ready_for_sprint.eq.true'),
        supabase
          .from('work_manager_tasks')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Backlog', 'On Hold']),
        supabase
          .from('work_manager_tasks')
          .select('id', { count: 'exact', head: true })
          .or('decision_required.eq.true,review_status.eq.pending'),
      ]);

      const total = totalCount || 0;

      return {
        items,
        counts: {
          planned: plannedResult.count || 0,
          upcoming: upcomingResult.count || 0,
          pendingReview: pendingReviewResult.count || 0,
        },
        pagination: {
          page,
          pageSize,
          total,
          hasMore: from + pageSize < total,
        },
      };
    },
    staleTime: 1000 * 30,
  });
}

// ============================================
// HELPER: Get default filters
// ============================================
export function getDefaultPlannerFilters(): PlannerFilters {
  return {
    status: [],
    decisionRequired: null,
    readyForSprint: null,
    plannedDateFrom: null,
    plannedDateTo: null,
  };
}

// ============================================
// HELPER: Serialize filters to URL params
// ============================================
export function serializePlannerFilters(filters: PlannerFilters): Record<string, string> {
  const params: Record<string, string> = {};
  
  if (filters.status.length > 0) {
    params.status = filters.status.join(',');
  }
  if (filters.decisionRequired !== null) {
    params.decisionRequired = String(filters.decisionRequired);
  }
  if (filters.readyForSprint !== null) {
    params.readyForSprint = String(filters.readyForSprint);
  }
  if (filters.plannedDateFrom) {
    params.plannedDateFrom = filters.plannedDateFrom;
  }
  if (filters.plannedDateTo) {
    params.plannedDateTo = filters.plannedDateTo;
  }
  
  return params;
}

// ============================================
// HELPER: Deserialize filters from URL params
// ============================================
export function deserializePlannerFilters(params: URLSearchParams): PlannerFilters {
  return {
    status: params.get('status')?.split(',').filter(Boolean) || [],
    decisionRequired: params.has('decisionRequired') 
      ? params.get('decisionRequired') === 'true' 
      : null,
    readyForSprint: params.has('readyForSprint') 
      ? params.get('readyForSprint') === 'true' 
      : null,
    plannedDateFrom: params.get('plannedDateFrom') || null,
    plannedDateTo: params.get('plannedDateTo') || null,
  };
}

// ============================================
// HELPER: Check if filters are active
// ============================================
export function hasActivePlannerFilters(filters: PlannerFilters): boolean {
  return (
    filters.status.length > 0 ||
    filters.decisionRequired !== null ||
    filters.readyForSprint !== null ||
    filters.plannedDateFrom !== null ||
    filters.plannedDateTo !== null
  );
}
