/**
 * useFeature - Feature CRUD operations for Feature Detail Page
 * 
 * Provides:
 * - useFeature(featureId) - Fetch single feature with relations
 * - useUpdateFeature() - Update feature mutation
 * - useFeatureTransition() - Status workflow (simplified v1)
 * - useLinkStory() - Link existing story to feature
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FeatureStatus = 'funnel' | 'analyzing' | 'backlog' | 'implementing' | 'done';

export interface FeatureWithRelations {
  id: string;
  display_id: string | null;
  name: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: FeatureStatus | null;
  health: string | null;
  blocked: boolean | null;
  blocked_reason: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  owner_id: string | null;
  epic_id: string;
  project_id: string;
  progress_pct: number | null;
  updated_at: string | null;
  created_at: string | null;
  // Relations
  owner: { id: string; full_name: string; email?: string } | null;
  epic: { id: string; epic_key: string; name: string; primary_program_id?: string | null } | null;
  project: { id: string; name: string } | null;
}

/**
 * Fetch a single feature with all its relations
 */
export function useFeature(featureId: string | undefined) {
  return useQuery({
    queryKey: ['feature-detail', featureId],
    queryFn: async (): Promise<FeatureWithRelations | null> => {
      if (!featureId) return null;

      const { data, error } = await supabase
        .from('features')
        .select(`
          id, display_id, name, description, acceptance_criteria, status, health,
          blocked, blocked_reason, planned_start_date, planned_end_date,
          owner_id, epic_id, project_id, progress_pct, updated_at, created_at
        `)
        .eq('id', featureId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Fetch relations in parallel
      const [ownerResult, epicResult, projectResult] = await Promise.all([
        data.owner_id 
          ? supabase.from('profiles').select('id, full_name, email').eq('id', data.owner_id).single()
          : { data: null },
        data.epic_id
          ? supabase.from('epics').select('id, epic_key, name, primary_program_id').eq('id', data.epic_id).single()
          : { data: null },
        data.project_id
          ? supabase.from('projects').select('id, name').eq('id', data.project_id).single()
          : { data: null },
      ]);

      return {
        ...data,
        status: data.status as FeatureStatus,
        owner: ownerResult.data,
        epic: epicResult.data,
        project: projectResult.data,
      };
    },
    enabled: !!featureId,
  });
}

/**
 * Update feature mutation
 */
export function useUpdateFeature(featureId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<{
      name: string;
      description: string;
      acceptance_criteria: string;
      status: FeatureStatus;
      health: 'green' | 'yellow' | 'red';
      blocked: boolean;
      blocked_reason: string;
      planned_start_date: string;
      planned_end_date: string;
      owner_id: string;
    }>) => {
      if (!featureId) throw new Error('Feature ID required');

      const { error } = await supabase
        .from('features')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', featureId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-detail', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['feature-stories', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-story-stats', featureId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update feature', { description: error.message });
    },
  });
}

/**
 * Feature status transition (simplified v1 - just updates status)
 * In a future version, this would validate workflow rules
 */
export function useFeatureTransition(featureId: string | undefined) {
  const updateFeature = useUpdateFeature(featureId);

  return useMutation({
    mutationFn: async (nextStatus: FeatureStatus) => {
      await updateFeature.mutateAsync({ status: nextStatus });
    },
    onSuccess: () => {
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to transition status', { description: error.message });
    },
  });
}

/**
 * Fetch story stats for a feature
 */
export function useFeatureStoryStats(featureId: string | undefined) {
  return useQuery({
    queryKey: ['feature-story-stats', featureId],
    queryFn: async () => {
      if (!featureId) return { total: 0, done: 0, blocked: 0 };

      const { data, error } = await supabase
        .from('stories')
        .select('id, status, state')
        .eq('feature_id', featureId);

      if (error) {
        console.error('Failed to fetch stories:', error);
        return { total: 0, done: 0, blocked: 0 };
      }

      const stories = data || [];
      return {
        total: stories.length,
        done: stories.filter(s => s.status === 'done' || s.state === 'done').length,
        blocked: stories.filter(s => (s.status as string) === 'blocked' || (s.state as string) === 'blocked').length,
      };
    },
    enabled: !!featureId,
  });
}

/**
 * Fetch stories for a feature
 */
export function useFeatureStories(featureId: string | undefined) {
  return useQuery({
    queryKey: ['feature-stories', featureId],
    queryFn: async () => {
      if (!featureId) return [];

      const { data, error } = await supabase
        .from('stories')
        .select('id, name, story_key, status, state, priority, estimate_points, assignee_id, updated_at')
        .eq('feature_id', featureId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch stories:', error);
        return [];
      }

      const storyData = data || [];
      const assigneeIds = [...new Set(storyData.filter(s => s.assignee_id).map(s => s.assignee_id))] as string[];

      const assigneesResult = assigneeIds.length > 0 
        ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
        : { data: [] };

      const assigneeMap = new Map((assigneesResult.data || []).map(a => [a.id, a]));

      return storyData.map(story => ({
        ...story,
        assignee: story.assignee_id ? assigneeMap.get(story.assignee_id) : null,
      }));
    },
    enabled: !!featureId,
  });
}

/**
 * Create a story for a feature
 */
export function useCreateFeatureStory(featureId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyData: {
      name: string;
      description?: string;
      acceptance_criteria?: string;
    }) => {
      if (!featureId) throw new Error('Feature ID required');

      const { data, error } = await supabase
        .from('stories')
        .insert({
          name: storyData.name,
          title: storyData.name,
          description: storyData.description || null,
          acceptance_criteria: storyData.acceptance_criteria || null,
          feature_id: featureId,
          status: 'todo',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-stories', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-story-stats', featureId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create story', { description: error.message });
    },
  });
}

/**
 * Fetch available users for assignment picker
 */
export function useAvailableUsers() {
  return useQuery({
    queryKey: ['available-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
  });
}
