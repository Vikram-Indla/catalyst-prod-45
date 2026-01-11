/**
 * useWorkItems — Data fetching hook for work items
 * Supports filtering, sorting, and real-time updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  WorkItemWithRelations, 
  WorkItemFilters,
  WorkItemType,
  PriorityLevel
} from '@/types/work-items';
import { useAuth } from '@/hooks/useAuth';

const WORK_ITEMS_KEY = 'work-items';

export function useWorkItems(projectId: string, filters?: WorkItemFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [WORK_ITEMS_KEY, projectId, filters],
    queryFn: async (): Promise<WorkItemWithRelations[]> => {
      let query = supabase
        .from('work_items')
        .select(`
          *,
          assignee:profiles!work_items_assignee_id_fkey(id, full_name, avatar_url),
          reporter:profiles!work_items_reporter_id_fkey(id, full_name, avatar_url),
          feature:features!work_items_feature_id_fkey(id, name, display_id),
          fixed_version:releases!work_items_fixed_version_id_fkey(id, name)
        `)
        .eq('project_id', projectId)
        .is('parent_work_item_id', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.assignee_id === 'me' && user?.id) {
        query = query.eq('assignee_id', user.id);
      } else if (filters?.assignee_id && filters.assignee_id !== 'all') {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      
      if (filters?.feature_id && filters.feature_id !== 'all') {
        query = query.eq('feature_id', filters.feature_id);
      }
      
      if (filters?.fixed_version_id && filters.fixed_version_id !== 'all') {
        query = query.eq('fixed_version_id', filters.fixed_version_id);
      }
      
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      
      if (filters?.search) {
        query = query.or(`summary.ilike.%${filters.search}%,key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching work items:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        parent_work_item: null,
        subtasks: [],
      })) as WorkItemWithRelations[];
    },
    enabled: !!projectId,
  });
}

interface CreateWorkItemInput {
  project_id: string;
  type: WorkItemType;
  summary: string;
  description?: string;
  feature_id?: string;
  parent_work_item_id?: string;
  assignee_id?: string;
  priority?: PriorityLevel;
  story_points?: number;
  fixed_version_id?: string;
  due_date?: string;
  severity?: string;
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateWorkItemInput) => {
      // First get next sequence number for the project
      const { data: seqData } = await supabase
        .from('work_items')
        .select('sequence_number')
        .eq('project_id', input.project_id)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .single();
      
      const nextSeq = (seqData?.sequence_number ?? 0) + 1;
      
      // Get project key for generating work item key
      const { data: project } = await supabase
        .from('projects')
        .select('key')
        .eq('id', input.project_id)
        .single();
      
      const itemKey = `${project?.key || 'WI'}-${nextSeq}`;

      const { data, error } = await supabase
        .from('work_items')
        .insert({
          key: itemKey,
          sequence_number: nextSeq,
          project_id: input.project_id,
          type: input.type,
          summary: input.summary,
          description: input.description || null,
          feature_id: input.feature_id || null,
          parent_work_item_id: input.parent_work_item_id || null,
          assignee_id: input.assignee_id || null,
          priority: input.priority || 'P3',
          story_points: input.story_points || null,
          fixed_version_id: input.fixed_version_id || null,
          due_date: input.due_date || null,
          reporter_id: user?.id || null,
          status: 'backlog',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY, data.project_id] });
    },
  });
}

export function useUpdateWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('work_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
    },
  });
}

export function useDeleteWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
    },
  });
}

// Hook for getting features for filter dropdown
export function useProjectFeatures(projectId: string) {
  return useQuery({
    queryKey: ['features', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

// Hook for getting releases for filter dropdown
export function useProjectReleases(projectId: string) {
  return useQuery({
    queryKey: ['releases', 'project', projectId],
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      // Get project's program_id first
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('program_id')
        .eq('id', projectId)
        .single();

      if (projectError || !projectData?.program_id) return [];

      // Fetch releases using explicit any cast to break type recursion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from('releases')
        .select('id, name')
        .eq('program_id', projectData.program_id)
        .order('name');

      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
    enabled: !!projectId,
  });
}
