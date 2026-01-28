// ============================================================
// WORKSTREAM MUTATIONS HOOK
// Update workstream name/details and manage members
// Members are linked via user_id to profiles table (APPROVED users only)
// ============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types - members now link to profiles via user_id
export interface WorkstreamMember {
  id: string;
  user_id: string;
  workstream_id: string;
  role: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    vendor: string | null;
    role: string | null;
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

// Fetch workstream members with profile details (APPROVED users only)
export function useWorkstreamMembers(workstreamId: string | null) {
  return useQuery({
    queryKey: ['workstream-members', workstreamId],
    queryFn: async () => {
      if (!workstreamId) return [];
      
      // Fetch members with user_id
      const { data: membersData, error: membersError } = await supabase
        .from('workstream_members')
        .select('id, user_id, workstream_id, role')
        .eq('workstream_id', workstreamId)
        .not('user_id', 'is', null);
      
      if (membersError) {
        console.error('Error fetching workstream members:', membersError);
        throw membersError;
      }
      
      if (!membersData || membersData.length === 0) return [];
      
      // Get unique user IDs and fetch their profiles
      const userIds = membersData.map(m => m.user_id).filter(Boolean);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, vendor, role')
        .in('id', userIds)
        .eq('approval_status', 'APPROVED');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      // Create profile lookup map
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      // Combine members with profiles
      return membersData
        .filter(m => m.user_id && profileMap.has(m.user_id))
        .map(m => ({
          id: m.id,
          user_id: m.user_id!,
          workstream_id: m.workstream_id,
          role: m.role || 'member',
          profile: profileMap.get(m.user_id!) || null,
        })) as WorkstreamMember[];
    },
    enabled: !!workstreamId,
  });
}

// Update workstream details
export function useUpdateWorkstream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      color,
      start_date,
      due_date,
    }: { 
      id: string; 
      name?: string; 
      color?: string;
      start_date?: string | null;
      due_date?: string | null;
    }) => {
      const updates: Record<string, string | null> = {};
      if (name) updates.name = name;
      if (color) updates.color = color;
      if (start_date !== undefined) updates.start_date = start_date;
      if (due_date !== undefined) updates.due_date = due_date;
      
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
      queryClient.invalidateQueries({ queryKey: ['workstreams-summary'] });
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

// Add member to workstream (uses user_id to link to profiles)
export function useAddWorkstreamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      workstreamId, 
      userId,
      role = 'member'
    }: { 
      workstreamId: string; 
      userId: string;
      role?: string;
    }) => {
      const { data, error } = await supabase
        .from('workstream_members')
        .insert({
          workstream_id: workstreamId,
          user_id: userId,
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
      queryClient.invalidateQueries({ queryKey: ['workstreams-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['workstreams-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['workstreams-summary'] });
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      toast.success('Workstream archived');
    },
    onError: () => {
      toast.error('Failed to archive workstream');
    },
  });
}
