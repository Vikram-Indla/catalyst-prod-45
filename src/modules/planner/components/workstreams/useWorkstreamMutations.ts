// ============================================================
// WORKSTREAM MUTATIONS HOOK
// Update workstream name/details and manage members
// ============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface WorkstreamMember {
  id: string;
  resource_id: string;
  workstream_id: string;
  role: string;
  resource: {
    id: string;
    name: string;
    email: string | null;
    role_name: string | null;
  } | null;
}

// Fetch workstream details
export function useWorkstreamDetails(workstreamId: string | null) {
  return useQuery({
    queryKey: ['workstream-details', workstreamId],
    queryFn: async () => {
      if (!workstreamId) return null;
      
      const { data, error } = await supabase
        .from('planner_workstreams')
        .select('*')
        .eq('id', workstreamId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!workstreamId,
  });
}

// Fetch workstream members with resource details
export function useWorkstreamMembers(workstreamId: string | null) {
  return useQuery({
    queryKey: ['workstream-members', workstreamId],
    queryFn: async () => {
      if (!workstreamId) return [];
      
      const { data, error } = await supabase
        .from('workstream_members')
        .select(`
          id,
          resource_id,
          workstream_id,
          role,
          resource:resource_inventory(id, name, email, role_name)
        `)
        .eq('workstream_id', workstreamId);
      
      if (error) throw error;
      return (data || []) as WorkstreamMember[];
    },
    enabled: !!workstreamId,
  });
}

// Fetch available resources (for adding members)
export function useAvailableResources() {
  return useQuery({
    queryKey: ['available-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id, name, email, role_name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Update workstream details
export function useUpdateWorkstream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      color 
    }: { 
      id: string; 
      name?: string; 
      color?: string;
    }) => {
      const updates: Record<string, string> = {};
      if (name) updates.name = name;
      if (color) updates.color = color;
      
      const { data, error } = await supabase
        .from('planner_workstreams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream-details'] });
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      toast.success('Workstream updated');
    },
    onError: (err) => {
      console.error('Failed to update workstream:', err);
      toast.error('Failed to update workstream');
    },
  });
}

// Add member to workstream
export function useAddWorkstreamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      workstreamId, 
      resourceId,
      role = 'member'
    }: { 
      workstreamId: string; 
      resourceId: string;
      role?: string;
    }) => {
      const { data, error } = await supabase
        .from('workstream_members')
        .insert({
          workstream_id: workstreamId,
          resource_id: resourceId,
          role,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workstream-members', variables.workstreamId] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      toast.success('Member added');
    },
    onError: (err: any) => {
      if (err.message?.includes('duplicate')) {
        toast.error('Member already added');
      } else {
        toast.error('Failed to add member');
      }
    },
  });
}

// Remove member from workstream
export function useRemoveWorkstreamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      memberId, 
      workstreamId 
    }: { 
      memberId: string; 
      workstreamId: string;
    }) => {
      const { error } = await supabase
        .from('workstream_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workstream-members', variables.workstreamId] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      toast.success('Member removed');
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });
}

// Archive workstream
export function useArchiveWorkstream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planner_workstreams')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      toast.success('Workstream archived');
    },
    onError: () => {
      toast.error('Failed to archive workstream');
    },
  });
}
