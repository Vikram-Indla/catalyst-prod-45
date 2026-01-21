// ════════════════════════════════════════════════════════════════════════════
// SPACE WORK ITEMS HOOKS - Epics, Features, Stories scoped to Spaces
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SpaceWorkItemType = 'epic' | 'feature' | 'story' | 'task' | 'bug' | 'subtask';
export type SpaceWorkItemStatus = 'backlog' | 'ready' | 'in_progress' | 'in_review' | 'blocked' | 'done' | 'closed';
export type SpaceWorkItemPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface SpaceWorkItem {
  id: string;
  space_id: string;
  key: string;
  sequence_number: number;
  type: SpaceWorkItemType;
  summary: string;
  description: string | null;
  parent_id: string | null;
  reporter_id: string | null;
  assignee_id: string | null;
  priority: SpaceWorkItemPriority;
  status: SpaceWorkItemStatus;
  story_points: number | null;
  labels: string[];
  component_id: string | null;
  version_id: string | null;
  rank_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined fields
  assignee?: { id: string; full_name: string | null; avatar_url: string | null };
  reporter?: { id: string; full_name: string | null };
}

export interface CreateSpaceWorkItemInput {
  space_id: string;
  type: SpaceWorkItemType;
  summary: string;
  description?: string;
  parent_id?: string;
  assignee_id?: string;
  priority?: SpaceWorkItemPriority;
  story_points?: number;
  labels?: string[];
  component_id?: string;
  version_id?: string;
}

export interface UpdateSpaceWorkItemInput {
  summary?: string;
  description?: string;
  parent_id?: string | null;
  assignee_id?: string | null;
  priority?: SpaceWorkItemPriority;
  status?: SpaceWorkItemStatus;
  story_points?: number | null;
  labels?: string[];
  component_id?: string | null;
  version_id?: string | null;
  rank_order?: number;
}

const QUERY_KEY = 'space-work-items';

export function useSpaceWorkItems(spaceId: string | undefined, filters?: { type?: SpaceWorkItemType; status?: SpaceWorkItemStatus; search?: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, spaceId, filters],
    queryFn: async (): Promise<SpaceWorkItem[]> => {
      let query = supabase
        .from('space_work_items')
        .select(`
          *,
          assignee:profiles!space_work_items_assignee_id_fkey(id, full_name, avatar_url),
          reporter:profiles!space_work_items_reporter_id_fkey(id, full_name)
        `)
        .eq('space_id', spaceId!)
        .order('rank_order', { ascending: true });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`summary.ilike.%${filters.search}%,key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SpaceWorkItem[];
    },
    enabled: !!spaceId,
  });
}

export function useCreateSpaceWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSpaceWorkItemInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Build insert object - only include fields that exist in the table schema
      const insertData: Record<string, unknown> = {
        space_id: input.space_id,
        type: input.type,
        summary: input.summary,
        key: 'TEMP', // Will be overwritten by trigger
      };
      
      if (input.description) insertData.description = input.description;
      if (input.parent_id) insertData.parent_id = input.parent_id;
      if (input.assignee_id) insertData.assignee_id = input.assignee_id;
      if (input.priority) insertData.priority = input.priority;
      if (input.story_points) insertData.story_points = input.story_points;
      if (input.labels) insertData.labels = input.labels;
      if (input.component_id) insertData.component_id = input.component_id;
      if (input.version_id) insertData.version_id = input.version_id;
      if (user?.id) {
        insertData.reporter_id = user.id;
        insertData.created_by = user.id;
        insertData.updated_by = user.id;
      }

      const { data, error } = await supabase
        .from('space_work_items')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.space_id] });
    },
  });
}

export function useUpdateSpaceWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, spaceId, ...input }: UpdateSpaceWorkItemInput & { id: string; spaceId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('space_work_items')
        .update({ ...input, updated_by: user?.id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, spaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.spaceId] });
    },
  });
}

export function useDeleteSpaceWorkItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, spaceId }: { id: string; spaceId: string }) => {
      const { error } = await supabase.from('space_work_items').delete().eq('id', id);
      if (error) throw error;
      return { spaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.spaceId] });
    },
  });
}
