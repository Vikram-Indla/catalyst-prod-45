// ============================================================================
// ADMIN CONFIG HOOKS
// File: /hooks/test-management/useAdminConfig.ts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TMCasePriority, TMCaseType, TMLabel } from '@/types/test-management';

// ============================================================================
// PRIORITIES
// ============================================================================

export function useCasePriorities(projectId: string | null) {
  return useQuery({
    queryKey: ['tm-priorities', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('tm_case_priorities')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      // Map to our type structure
      return (data || []).map(row => ({
        id: row.id,
        project_id: row.project_id || projectId,
        name: row.name,
        color: row.color || '#6b7280',
        sort_order: row.sort_order || 0,
        is_default: row.is_default || false,
      })) as TMCasePriority[];
    },
    enabled: !!projectId,
  });
}

export function useCreatePriority() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; color?: string; sort_order?: number; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from('tm_case_priorities')
        .insert({
          project_id: input.project_id,
          name: input.name,
          color: input.color || '#6b7280',
          sort_order: input.sort_order || 0,
          is_default: input.is_default || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-priorities', data.project_id] });
    },
  });
}

export function useUpdatePriority() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: { id: string; project_id: string; name?: string; color?: string; sort_order?: number; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from('tm_case_priorities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-priorities', data.project_id] });
    },
  });
}

export function useDeletePriority() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('tm_case_priorities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-priorities', variables.projectId] });
    },
  });
}

// ============================================================================
// CASE TYPES
// ============================================================================

export function useCaseTypes(projectId: string | null) {
  return useQuery({
    queryKey: ['tm-types', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('tm_case_types')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // Map to our type structure (db doesn't have sort_order)
      return (data || []).map((row, index) => ({
        id: row.id,
        project_id: row.project_id || projectId,
        name: row.name,
        icon: row.icon || undefined,
        sort_order: index, // Derive from position
        is_default: row.is_default || false,
      })) as TMCaseType[];
    },
    enabled: !!projectId,
  });
}

export function useCreateType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; icon?: string; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from('tm_case_types')
        .insert({
          project_id: input.project_id,
          name: input.name,
          icon: input.icon,
          is_default: input.is_default || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-types', data.project_id] });
    },
  });
}

export function useUpdateType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: { id: string; project_id: string; name?: string; icon?: string; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from('tm_case_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-types', data.project_id] });
    },
  });
}

export function useDeleteType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('tm_case_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-types', variables.projectId] });
    },
  });
}

// ============================================================================
// LABELS
// ============================================================================

export function useLabels(projectId: string | null) {
  return useQuery({
    queryKey: ['tm-labels', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('tm_labels')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        project_id: row.project_id || projectId,
        name: row.name,
        color: row.color || '#6b7280',
      })) as TMLabel[];
    },
    enabled: !!projectId,
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; color?: string }) => {
      const { data, error } = await supabase
        .from('tm_labels')
        .insert({
          project_id: input.project_id,
          name: input.name,
          color: input.color || '#6b7280',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-labels', data.project_id] });
    },
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: { id: string; project_id: string; name?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('tm_labels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-labels', data.project_id] });
    },
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('tm_labels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-labels', variables.projectId] });
    },
  });
}

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export function useTeamMembers(_projectId: string | null) {
  return useQuery({
    queryKey: ['tm-team-members'],
    queryFn: async () => {
      // Get team members from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return (data || []) as Array<{ id: string; full_name: string; avatar_url?: string | null }>;
    },
  });
}

// ============================================================================
// ENVIRONMENTS
// ============================================================================

export function useEnvironments(projectId: string | null) {
  return useQuery({
    queryKey: ['tm-environments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('tm_environments')
        .select('id, name, description, is_active')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(e => e.name) as string[];
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute - environments rarely change
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// ============================================================================
// SEED PROJECT CONFIG
// ============================================================================

export function useSeedProjectConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectId: string) => {
      // Seed default priorities
      const defaultPriorities = [
        { project_id: projectId, name: 'Critical', color: '#ef4444', sort_order: 1, is_default: false },
        { project_id: projectId, name: 'High', color: '#f97316', sort_order: 2, is_default: false },
        { project_id: projectId, name: 'Medium', color: '#eab308', sort_order: 3, is_default: true },
        { project_id: projectId, name: 'Low', color: '#22c55e', sort_order: 4, is_default: false },
      ];
      
      const { error: priorityError } = await supabase
        .from('tm_case_priorities')
        .insert(defaultPriorities);
      
      if (priorityError) throw priorityError;
      
      // Seed default types
      const defaultTypes = [
        { project_id: projectId, name: 'Functional', icon: 'CheckCircle', is_default: true },
        { project_id: projectId, name: 'Regression', icon: 'RefreshCw', is_default: false },
        { project_id: projectId, name: 'Smoke', icon: 'Zap', is_default: false },
        { project_id: projectId, name: 'Integration', icon: 'Link', is_default: false },
        { project_id: projectId, name: 'Performance', icon: 'Gauge', is_default: false },
      ];
      
      const { error: typeError } = await supabase
        .from('tm_case_types')
        .insert(defaultTypes);
      
      if (typeError) throw typeError;
      
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tm-priorities', result.projectId] });
      queryClient.invalidateQueries({ queryKey: ['tm-types', result.projectId] });
    },
  });
}
