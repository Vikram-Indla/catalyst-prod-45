import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { ActivityLogEntry, ActivityFilters, ActivityAction, EntityType } from '@/types/integrations.types';

// Mock activity log data
const generateMockActivityLog = (cycleId: string): ActivityLogEntry[] => {
  const actions: Array<{
    action: ActivityAction;
    entity_type: EntityType;
    description: string;
    old_value?: Record<string, unknown>;
    new_value?: Record<string, unknown>;
  }> = [
    {
      action: 'status_changed',
      entity_type: 'test_case',
      description: 'TC-005',
      old_value: { status: 'not_started' },
      new_value: { status: 'in_progress' },
    },
    {
      action: 'assigned',
      entity_type: 'test_case',
      description: 'TC-012',
      new_value: { assignee: 'Sara M.' },
    },
    {
      action: 'status_changed',
      entity_type: 'test_case',
      description: 'TC-003',
      old_value: { status: 'in_progress' },
      new_value: { status: 'passed' },
    },
    {
      action: 'defect_linked',
      entity_type: 'defect',
      description: 'JIRA-456',
      new_value: { test_case: 'TC-008', defect_id: 'JIRA-456' },
    },
    {
      action: 'priority_changed',
      entity_type: 'test_case',
      description: 'TC-015',
      old_value: { priority: 'medium' },
      new_value: { priority: 'critical' },
    },
    {
      action: 'comment_added',
      entity_type: 'comment',
      description: 'TC-003',
      new_value: { comment: 'Verified fix in staging environment' },
    },
    {
      action: 'smart_assignment_run',
      entity_type: 'cycle',
      description: 'Regression R2.1',
      new_value: { tests_assigned: 45, team_members: 5 },
    },
    {
      action: 'test_added',
      entity_type: 'test_case',
      description: 'TC-048',
      new_value: { title: 'New checkout flow validation' },
    },
    {
      action: 'due_date_changed',
      entity_type: 'test_case',
      description: 'TC-022',
      old_value: { due_date: '2026-01-15' },
      new_value: { due_date: '2026-01-17' },
    },
    {
      action: 'status_changed',
      entity_type: 'test_case',
      description: 'TC-008',
      old_value: { status: 'in_progress' },
      new_value: { status: 'failed' },
    },
    {
      action: 'bulk_assigned',
      entity_type: 'cycle',
      description: 'Regression R2.1',
      new_value: { tests_count: 12, assignee: 'Omar T.' },
    },
    {
      action: 'cycle_started',
      entity_type: 'cycle',
      description: 'Regression R2.1',
      new_value: { start_date: '2026-01-10' },
    },
  ];

  const users = [
    { full_name: 'Ahmed S.', avatar_url: null },
    { full_name: 'Sara M.', avatar_url: null },
    { full_name: 'Omar T.', avatar_url: null },
    { full_name: 'Fatima K.', avatar_url: null },
    { full_name: 'System', avatar_url: null },
  ];

  return actions.map((action, index) => ({
    id: `activity-${index}`,
    project_id: 'project-1',
    cycle_id: cycleId,
    user_id: `user-${index % 5}`,
    action: action.action,
    entity_type: action.entity_type,
    entity_id: `entity-${index}`,
    old_value: action.old_value || null,
    new_value: action.new_value || null,
    metadata: { description: action.description },
    created_at: new Date(Date.now() - index * 45 * 60 * 1000).toISOString(),
    user: users[index % users.length],
  }));
};

export function useActivityLog(cycleId: string, filters?: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: ['activity-log', cycleId, filters],
    queryFn: async ({ pageParam = 0 }) => {
      // In production:
      // let query = supabase
      //   .from('activity_log')
      //   .select('*, user:auth.users(full_name, avatar_url)')
      //   .eq('cycle_id', cycleId)
      //   .order('created_at', { ascending: false })
      //   .range(pageParam, pageParam + 19);
      
      // if (filters?.userId) query = query.eq('user_id', filters.userId);
      // if (filters?.action) query = query.eq('action', filters.action);
      // if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
      // if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
      // if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);
      
      // const { data, error } = await query;
      // if (error) throw error;
      // return data;
      
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      let data = generateMockActivityLog(cycleId);
      
      // Apply filters
      if (filters?.action) {
        data = data.filter((item) => item.action === filters.action);
      }
      if (filters?.entityType) {
        data = data.filter((item) => item.entity_type === filters.entityType);
      }
      
      // Pagination
      const startIndex = pageParam;
      const endIndex = pageParam + 20;
      return data.slice(startIndex, endIndex);
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    initialPageParam: 0,
  });
}

export function useLogActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      cycleId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      metadata,
    }: {
      projectId: string;
      cycleId?: string;
      action: ActivityAction;
      entityType: EntityType;
      entityId?: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) => {
      // In production:
      // const { error } = await supabase.rpc('log_activity', {
      //   p_project_id: projectId,
      //   p_cycle_id: cycleId,
      //   p_user_id: user?.id,
      //   p_action: action,
      //   p_entity_type: entityType,
      //   p_entity_id: entityId,
      //   p_old_value: oldValue,
      //   p_new_value: newValue,
      //   p_metadata: metadata,
      // });
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log('Logged activity:', { action, entityType, entityId });
    },
    onSuccess: (_, variables) => {
      if (variables.cycleId) {
        queryClient.invalidateQueries({ queryKey: ['activity-log', variables.cycleId] });
      }
    },
  });
}

export function useActivityFilters(cycleId: string) {
  // Get unique users and actions from activity log
  const { data: activities } = useActivityLog(cycleId);
  
  const users = activities?.pages
    .flat()
    .map((a) => a.user)
    .filter((u, i, arr) => u && arr.findIndex((x) => x?.full_name === u.full_name) === i) || [];
  
  const actions = [
    'status_changed',
    'assigned',
    'test_added',
    'test_removed',
    'comment_added',
    'defect_linked',
    'priority_changed',
    'due_date_changed',
    'bulk_assigned',
    'smart_assignment_run',
    'cycle_started',
    'cycle_completed',
  ] as ActivityAction[];
  
  const entityTypes = ['cycle', 'test_case', 'defect', 'comment', 'assignment'] as EntityType[];
  
  return { users, actions, entityTypes };
}
