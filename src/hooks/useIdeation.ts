// ==============================================
// IDEATION MODULE - REACT QUERY HOOKS
// ==============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type {
  IdeaGroup,
  Idea,
  IdeationVote,
  IdeationComment,
  IdeationAttachment,
  IdeationSubscription,
  IdeationForm,
  IdeationMetrics,
  CreateIdeaRequest,
  UpdateIdeaRequest,
  CastVoteRequest,
  CreateIdeaGroupRequest,
  UpdateIdeaGroupRequest,
  IdeaFilters,
  IdeaSort,
} from '@/types/ideation';
import { toast } from 'sonner';

// ==============================================
// IDEA GROUPS HOOKS
// ==============================================

export function useIdeaGroups(enabledOnly = true) {
  return useQuery({
    queryKey: ['idea-groups', enabledOnly],
    queryFn: async () => {
      let query = supabase
        .from('idea_groups')
        .select('*')
        .order('name');
      
      if (enabledOnly) {
        query = query.eq('is_enabled', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as IdeaGroup[];
    },
  });
}

export function useIdeaGroup(groupId: string | null) {
  return useQuery({
    queryKey: ['idea-group', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from('idea_groups')
        .select('*')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data as IdeaGroup;
    },
    enabled: !!groupId,
  });
}

export function useCreateIdeaGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CreateIdeaGroupRequest) => {
      const { data, error } = await supabase
        .from('idea_groups')
        .insert(request)
        .select()
        .single();
      if (error) throw error;
      return data as IdeaGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idea-groups'] });
      toast.success('Idea group created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });
}

export function useUpdateIdeaGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...request }: UpdateIdeaGroupRequest & { id: string }) => {
      const { data, error } = await supabase
        .from('idea_groups')
        .update(request)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as IdeaGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['idea-groups'] });
      queryClient.invalidateQueries({ queryKey: ['idea-group', data.id] });
      toast.success('Idea group updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update group: ${error.message}`);
    },
  });
}

export function useDeleteIdeaGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('idea_groups')
        .delete()
        .eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idea-groups'] });
      toast.success('Idea group deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete group: ${error.message}`);
    },
  });
}

// ==============================================
// IDEAS HOOKS
// ==============================================

export function useIdeas(
  groupId: string | null,
  filters?: IdeaFilters,
  sort?: IdeaSort
) {
  return useQuery({
    queryKey: ['ideas', groupId, filters, sort],
    queryFn: async () => {
      if (!groupId) return [];
      
      let query = supabase
        .from('ideas')
        .select('*')
        .eq('idea_group_id', groupId);
      
      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }
      if (filters?.created_by_id) {
        query = query.eq('created_by_id', filters.created_by_id);
      }
      
      // Apply sort
      const sortField = sort?.field || 'created_at';
      const sortDir = sort?.direction || 'desc';
      query = query.order(sortField, { ascending: sortDir === 'asc' });
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Idea[];
    },
    enabled: !!groupId,
  });
}

export function useIdea(ideaId: string | null) {
  return useQuery({
    queryKey: ['idea', ideaId],
    queryFn: async () => {
      if (!ideaId) return null;
      const { data, error } = await supabase
        .from('ideas')
        .select('*, idea_group:idea_groups(*)')
        .eq('id', ideaId)
        .single();
      if (error) throw error;
      return data as unknown as Idea;
    },
    enabled: !!ideaId,
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (request: CreateIdeaRequest) => {
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          ...request,
          created_by_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Idea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', data.idea_group_id] });
      toast.success('Idea created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create idea: ${error.message}`);
    },
  });
}

export function useUpdateIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...request }: UpdateIdeaRequest & { id: string }) => {
      const { data, error } = await supabase
        .from('ideas')
        .update(request)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Idea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea', data.id] });
      toast.success('Idea updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update idea: ${error.message}`);
    },
  });
}

export function useDeleteIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ideaId: string) => {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', ideaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast.success('Idea deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete idea: ${error.message}`);
    },
  });
}

// ==============================================
// VOTING HOOKS
// ==============================================

export function useUserVote(ideaId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ideation-vote', ideaId, user?.id],
    queryFn: async () => {
      if (!ideaId || !user?.id) return null;
      const { data, error } = await supabase
        .from('ideation_votes')
        .select('*')
        .eq('idea_id', ideaId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as IdeationVote | null;
    },
    enabled: !!ideaId && !!user?.id,
  });
}

export function useUserTokensUsed(groupId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-tokens-used', groupId, user?.id],
    queryFn: async () => {
      if (!groupId || !user?.id) return 0;
      
      const { data, error } = await supabase
        .from('ideation_votes')
        .select('token_count, ideas!inner(idea_group_id)')
        .eq('user_id', user.id)
        .eq('vote_type', 'Token')
        .eq('ideas.idea_group_id', groupId);
      
      if (error) throw error;
      return data?.reduce((sum, v) => sum + (v.token_count || 0), 0) || 0;
    },
    enabled: !!groupId && !!user?.id,
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ ideaId, ...request }: CastVoteRequest & { ideaId: string }) => {
      // Upsert the vote
      const { data, error } = await supabase
        .from('ideation_votes')
        .upsert({
          idea_id: ideaId,
          user_id: user?.id,
          vote_type: request.vote_type,
          token_count: request.token_count || 0,
        }, {
          onConflict: 'idea_id,user_id',
        })
        .select()
        .single();
      if (error) throw error;
      return data as IdeationVote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['ideation-vote', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['user-tokens-used'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to cast vote: ${error.message}`);
    },
  });
}

export function useRemoveVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (ideaId: string) => {
      const { error } = await supabase
        .from('ideation_votes')
        .delete()
        .eq('idea_id', ideaId)
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: (_, ideaId) => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['ideation-vote', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['user-tokens-used'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to remove vote: ${error.message}`);
    },
  });
}

// ==============================================
// COMMENTS HOOKS
// ==============================================

export function useIdeaComments(ideaId: string | null) {
  return useQuery({
    queryKey: ['ideation-comments', ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      const { data, error } = await supabase
        .from('ideation_comments')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as IdeationComment[];
    },
    enabled: !!ideaId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ ideaId, content }: { ideaId: string; content: string }) => {
      const { data, error } = await supabase
        .from('ideation_comments')
        .insert({
          idea_id: ideaId,
          user_id: user?.id,
          content,
        })
        .select()
        .single();
      if (error) throw error;
      return data as IdeationComment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-comments', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] });
      toast.success('Comment added');
    },
    onError: (error: any) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commentId, ideaId }: { commentId: string; ideaId: string }) => {
      const { error } = await supabase
        .from('ideation_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      return { ideaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-comments', data.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast.success('Comment deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
}

// ==============================================
// SUBSCRIPTIONS HOOKS
// ==============================================

export function useUserSubscription(ideaId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ideation-subscription', ideaId, user?.id],
    queryFn: async () => {
      if (!ideaId || !user?.id) return null;
      const { data, error } = await supabase
        .from('ideation_subscriptions')
        .select('*')
        .eq('idea_id', ideaId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as IdeationSubscription | null;
    },
    enabled: !!ideaId && !!user?.id,
  });
}

export function useToggleSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ ideaId, isSubscribed }: { ideaId: string; isSubscribed: boolean }) => {
      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from('ideation_subscriptions')
          .delete()
          .eq('idea_id', ideaId)
          .eq('user_id', user?.id);
        if (error) throw error;
      } else {
        // Subscribe
        const { error } = await supabase
          .from('ideation_subscriptions')
          .insert({
            idea_id: ideaId,
            user_id: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-subscription', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      toast.success(variables.isSubscribed ? 'Unsubscribed' : 'Subscribed');
    },
    onError: (error: any) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
  });
}

// ==============================================
// BULK VOTES/SUBSCRIPTIONS HOOKS (for lists)
// ==============================================

export function useUserVotesForGroup(groupId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-votes-for-group', groupId, user?.id],
    queryFn: async () => {
      if (!groupId || !user?.id) return [];
      
      const { data: ideas } = await supabase
        .from('ideas')
        .select('id')
        .eq('idea_group_id', groupId);
      
      if (!ideas || ideas.length === 0) return [];
      
      const ideaIds = ideas.map(i => i.id);
      const { data, error } = await supabase
        .from('ideation_votes')
        .select('*')
        .eq('user_id', user.id)
        .in('idea_id', ideaIds);
      
      if (error) throw error;
      return (data || []) as IdeationVote[];
    },
    enabled: !!groupId && !!user?.id,
  });
}

export function useUserSubscriptionsForGroup() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('ideation_subscriptions')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return (data || []) as IdeationSubscription[];
    },
    enabled: !!user?.id,
  });
}

// ==============================================
// FORMS HOOKS
// ==============================================

export function useIdeationForms() {
  return useQuery({
    queryKey: ['ideation-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ideation_forms')
        .select(`
          *,
          fields:ideation_form_fields(*)
        `)
        .order('name');
      if (error) throw error;
      return data as IdeationForm[];
    },
  });
}

export function useIdeationForm(formId: string | null) {
  return useQuery({
    queryKey: ['ideation-form', formId],
    queryFn: async () => {
      if (!formId) return null;
      const { data, error } = await supabase
        .from('ideation_forms')
        .select(`
          *,
          fields:ideation_form_fields(*)
        `)
        .eq('id', formId)
        .single();
      if (error) throw error;
      return data as IdeationForm;
    },
    enabled: !!formId,
  });
}

// ==============================================
// METRICS HOOK
// ==============================================

export function useIdeationMetrics(groupId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ideation-metrics', groupId, user?.id],
    queryFn: async (): Promise<IdeationMetrics> => {
      if (!groupId) {
        return {
          total_ideas: 0,
          total_managed: 0,
          total_with_votes: 0,
          total_with_comments: 0,
          percent_managed: 0,
          percent_with_votes: 0,
          percent_with_comments: 0,
          user_contributed: 0,
          user_with_votes: 0,
          user_with_comments: 0,
          percent_user_contributed: 0,
          percent_user_with_votes: 0,
          percent_user_with_comments: 0,
        };
      }
      
      const { data: ideas, error } = await supabase
        .from('ideas')
        .select('id, status, vote_score, comment_count, created_by_id')
        .eq('idea_group_id', groupId);
      
      if (error) throw error;
      
      const total = ideas?.length || 0;
      const managed = ideas?.filter(i => ['Planned', 'Completed', 'Shelved'].includes(i.status)).length || 0;
      const withVotes = ideas?.filter(i => i.vote_score !== 0).length || 0;
      const withComments = ideas?.filter(i => i.comment_count > 0).length || 0;
      
      const userIdeas = ideas?.filter(i => i.created_by_id === user?.id) || [];
      const userTotal = userIdeas.length;
      const userWithVotes = userIdeas.filter(i => i.vote_score !== 0).length;
      const userWithComments = userIdeas.filter(i => i.comment_count > 0).length;
      
      return {
        total_ideas: total,
        total_managed: managed,
        total_with_votes: withVotes,
        total_with_comments: withComments,
        percent_managed: total > 0 ? Math.round((managed / total) * 100) : 0,
        percent_with_votes: total > 0 ? Math.round((withVotes / total) * 100) : 0,
        percent_with_comments: total > 0 ? Math.round((withComments / total) * 100) : 0,
        user_contributed: userTotal,
        user_with_votes: userWithVotes,
        user_with_comments: userWithComments,
        percent_user_contributed: total > 0 ? Math.round((userTotal / total) * 100) : 0,
        percent_user_with_votes: userTotal > 0 ? Math.round((userWithVotes / userTotal) * 100) : 0,
        percent_user_with_comments: userTotal > 0 ? Math.round((userWithComments / userTotal) * 100) : 0,
      };
    },
    enabled: !!groupId,
  });
}

// ==============================================
// ATTACHMENTS HOOKS
// ==============================================

export function useIdeaAttachments(ideaId: string | null) {
  return useQuery({
    queryKey: ['ideation-attachments', ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      const { data, error } = await supabase
        .from('ideation_attachments')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as IdeationAttachment[];
    },
    enabled: !!ideaId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ ideaId, file }: { ideaId: string; file: File }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${ideaId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ideation-attachments')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('ideation-attachments')
        .getPublicUrl(fileName);
      
      // Create attachment record
      const { data, error } = await supabase
        .from('ideation_attachments')
        .insert({
          idea_id: ideaId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: urlData.publicUrl,
          uploaded_by_id: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as IdeationAttachment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-attachments', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] });
      toast.success('Attachment uploaded');
    },
    onError: (error: any) => {
      toast.error(`Failed to upload: ${error.message}`);
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ attachmentId, ideaId, fileUrl }: { attachmentId: string; ideaId: string; fileUrl: string }) => {
      // Extract file path from URL
      const urlParts = fileUrl.split('/ideation-attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('ideation-attachments')
          .remove([filePath]);
      }
      
      // Delete attachment record
      const { error } = await supabase
        .from('ideation_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
      return { ideaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-attachments', data.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast.success('Attachment deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

// ==============================================
// USERS HOOK (for Owner dropdown)
// ==============================================

export function useIdeationUsers() {
  return useQuery({
    queryKey: ['ideation-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });
}
