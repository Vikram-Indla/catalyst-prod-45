import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IdeaGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'contributor';
  created_at: string;
  created_by: string | null;
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export function useIdeaGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['idea-group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      // Fetch members
      const { data: members, error } = await supabase
        .from('idea_group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error) throw error;
      if (!members || members.length === 0) return [];

      // Fetch profiles for these members
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      // Map profiles to members
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return members.map(member => ({
        ...member,
        role: member.role as 'admin' | 'contributor',
        profile: profileMap.get(member.user_id) || undefined,
      })) as IdeaGroupMember[];
    },
    enabled: !!groupId,
  });
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      groupId, 
      userId, 
      role 
    }: { 
      groupId: string; 
      userId: string; 
      role: 'admin' | 'contributor';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('idea_group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['idea-group-members', variables.groupId] });
      toast.success(`${variables.role === 'admin' ? 'Admin' : 'Contributor'} added`);
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('User is already a member with this role');
      } else {
        toast.error('Failed to add member');
      }
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      memberId, 
      groupId 
    }: { 
      memberId: string; 
      groupId: string;
    }) => {
      const { error } = await supabase
        .from('idea_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['idea-group-members', variables.groupId] });
      toast.success('Member removed');
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });
}
