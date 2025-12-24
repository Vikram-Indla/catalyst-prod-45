// src/hooks/home/useHomePlannerData.ts
// Planner Mode: Work Manager (Planning & Work Management)
// NOT "Approvals" - represents planning context

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
}

export interface PlannerItemsParams {
  category?: 'planned' | 'upcoming' | 'pending-review';
  search?: string;
  sort?: 'planned-date' | 'priority';
  page?: number;
  pageSize?: number;
  userId?: string;
}

export interface PlannerItemsResponse {
  items: PlannerWorkItem[];
  counts: {
    planned: number;
    upcoming: number;
    pendingReview: number;
  };
}

// ============================================
// SUMMARY HOOK
// ============================================
export function useHomePlannerSummary(userId?: string) {
  return useQuery({
    queryKey: ['home-planner-summary', userId],
    queryFn: async (): Promise<PlannerSummary> => {
      // Fetch work manager tasks count
      const { count: taskCount } = await supabase
        .from('work_manager_tasks')
        .select('id', { count: 'exact', head: true });

      // Fetch business requests counts by status
      const { data: requests } = await supabase
        .from('business_requests')
        .select('id, process_step')
        .is('deleted_at', null);

      const requestList = requests || [];

      // Categorize requests
      const pendingReviewSteps = ['Pending Review', 'Ready for Review', 'In Review'];
      const upcomingSteps = ['Draft', 'Submitted', 'Triage'];
      const plannedSteps = ['Approved', 'Scheduled', 'In Progress'];

      const pendingReview = requestList.filter(r => 
        pendingReviewSteps.includes(r.process_step || '')
      ).length;

      const upcoming = requestList.filter(r => 
        upcomingSteps.includes(r.process_step || '')
      ).length;

      const planned = requestList.filter(r => 
        plannedSteps.includes(r.process_step || '')
      ).length + (taskCount || 0);

      return {
        planned,
        upcoming,
        pendingReview,
      };
    },
    staleTime: 1000 * 30,
  });
}

// ============================================
// ITEMS HOOK
// ============================================
export function useHomePlannerItems(params: PlannerItemsParams = {}) {
  const { 
    category, 
    search, 
    sort = 'planned-date', 
    page = 1, 
    pageSize = 20,
    userId,
  } = params;

  return useQuery({
    queryKey: ['home-planner-items', category, search, sort, page, pageSize, userId],
    queryFn: async (): Promise<PlannerItemsResponse> => {
      const items: PlannerWorkItem[] = [];
      let plannedCount = 0;
      let upcomingCount = 0;
      let pendingReviewCount = 0;

      const from = (page - 1) * pageSize;

      // Fetch work manager tasks
      let taskQuery = supabase
        .from('work_manager_tasks')
        .select('*', { count: 'exact' });

      if (search) {
        taskQuery = taskQuery.ilike('title', `%${search}%`);
      }

      taskQuery = taskQuery.order('updated_at', { ascending: false });
      taskQuery = taskQuery.range(from, from + pageSize - 1);

      const { data: tasks, count: taskCount, error: taskError } = await taskQuery;

      if (taskError) throw taskError;

      plannedCount += taskCount || 0;

      (tasks || []).forEach(task => {
        items.push({
          id: task.id,
          key: task.key || `WM-${task.id.slice(0, 6)}`,
          summary: task.title,
          project: 'Work Manager',
          projectKey: 'WM',
          status: task.status,
          type: 'task' as WorkItemType,
          assignee: task.assignee_id,
          activityDate: new Date(task.updated_at || task.created_at),
          activityType: 'Updated',
          priority: task.priority,
        });
      });

      // Fetch business requests
      let requestQuery = supabase
        .from('business_requests')
        .select(`
          id,
          request_key,
          title,
          process_step,
          priority_tier,
          assignee,
          start_date,
          created_at,
          updated_at,
          product:products(id, name)
        `, { count: 'exact' })
        .is('deleted_at', null);

      // Apply category filter
      if (category === 'pending-review') {
        requestQuery = requestQuery.in('process_step', ['Pending Review', 'Ready for Review', 'In Review']);
      } else if (category === 'upcoming') {
        requestQuery = requestQuery.in('process_step', ['Draft', 'Submitted', 'Triage']);
      } else if (category === 'planned') {
        requestQuery = requestQuery.in('process_step', ['Approved', 'Scheduled', 'In Progress']);
      }

      if (search) {
        requestQuery = requestQuery.or(`title.ilike.%${search}%,request_key.ilike.%${search}%`);
      }

      // Apply sorting
      if (sort === 'planned-date') {
        requestQuery = requestQuery.order('start_date', { ascending: true, nullsFirst: false });
      } else {
        requestQuery = requestQuery.order('priority_tier', { ascending: true });
      }

      requestQuery = requestQuery.range(from, from + pageSize - 1);

      const { data: requests, count: requestCount, error: requestError } = await requestQuery;

      if (requestError) throw requestError;

      // Update counts based on category
      const pendingReviewSteps = ['Pending Review', 'Ready for Review', 'In Review'];
      const upcomingSteps = ['Draft', 'Submitted', 'Triage'];

      (requests || []).forEach(req => {
        if (pendingReviewSteps.includes(req.process_step || '')) {
          pendingReviewCount++;
        } else if (upcomingSteps.includes(req.process_step || '')) {
          upcomingCount++;
        } else {
          plannedCount++;
        }

        items.push({
          id: req.id,
          key: req.request_key || `BR-${req.id.slice(0, 6)}`,
          summary: req.title,
          project: req.product?.name || 'Business Requests',
          projectKey: 'BR',
          status: req.process_step || 'Draft',
          type: 'epic' as WorkItemType,
          assignee: req.assignee,
          activityDate: new Date(req.updated_at || req.created_at),
          activityType: 'Updated',
          priority: req.priority_tier,
          plannedDate: req.start_date ? new Date(req.start_date) : undefined,
        });
      });

      // Sort combined items
      if (sort === 'planned-date') {
        items.sort((a, b) => {
          if (a.plannedDate && b.plannedDate) {
            return a.plannedDate.getTime() - b.plannedDate.getTime();
          }
          return b.activityDate.getTime() - a.activityDate.getTime();
        });
      } else {
        items.sort((a, b) => b.activityDate.getTime() - a.activityDate.getTime());
      }

      return {
        items: items.slice(0, pageSize),
        counts: {
          planned: plannedCount,
          upcoming: upcomingCount,
          pendingReview: pendingReviewCount,
        },
      };
    },
    staleTime: 1000 * 30,
  });
}
