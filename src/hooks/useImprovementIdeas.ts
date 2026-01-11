// ============================================================
// IMPROVEMENT IDEAS MODULE - HOOKS
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ImprovementInitiative, 
  ImprovementIdea, 
  ImpactScore,
  IdeaVote,
  IdeasHubMetrics,
  ImprovementIdeaStatus,
  ImprovementIdeaCategory
} from '@/types/improvement-ideas';

// ============================================================
// INITIATIVES
// ============================================================

export function useImprovementInitiatives() {
  return useQuery({
    queryKey: ['improvement-initiatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('improvement_initiatives')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ImprovementInitiative[];
    },
  });
}

export function useImprovementInitiative(id: string | undefined) {
  return useQuery({
    queryKey: ['improvement-initiative', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('improvement_initiatives')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as ImprovementInitiative;
    },
    enabled: !!id,
  });
}

// ============================================================
// IDEAS
// ============================================================

interface UseImprovementIdeasFilters {
  initiativeId?: string;
  status?: ImprovementIdeaStatus[];
  category?: ImprovementIdeaCategory[];
  search?: string;
}

export function useImprovementIdeas(filters?: UseImprovementIdeasFilters) {
  return useQuery({
    queryKey: ['improvement-ideas', filters],
    queryFn: async () => {
      let query = supabase
        .from('improvement_ideas')
        .select(`
          *,
          initiative:improvement_initiatives(id, code, title, status),
          impact_score:impact_scores(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.initiativeId) {
        query = query.eq('initiative_id', filters.initiativeId);
      }
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.category?.length) {
        query = query.in('category', filters.category);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Flatten impact_score (take first current one)
      return (data || []).map(idea => ({
        ...idea,
        impact_score: Array.isArray(idea.impact_score) 
          ? idea.impact_score.find((s: ImpactScore) => s.is_current) 
          : idea.impact_score,
      })) as ImprovementIdea[];
    },
  });
}

export function useImprovementIdea(id: string | undefined) {
  return useQuery({
    queryKey: ['improvement-idea', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('improvement_ideas')
        .select(`
          *,
          initiative:improvement_initiatives(*),
          impact_score:impact_scores(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        impact_score: Array.isArray(data.impact_score) 
          ? data.impact_score.find((s: ImpactScore) => s.is_current) 
          : data.impact_score,
      } as ImprovementIdea;
    },
    enabled: !!id,
  });
}

export function useTopImprovementIdeas(limit = 5) {
  return useQuery({
    queryKey: ['improvement-ideas-top', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .select(`
          *,
          impact_score:impact_scores(calculated_score)
        `)
        .is('deleted_at', null)
        .in('status', ['submitted', 'under_review', 'scoring', 'approved'])
        .order('for_votes', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as ImprovementIdea[];
    },
  });
}

// ============================================================
// HUB METRICS
// ============================================================

export function useIdeasHubMetrics() {
  return useQuery({
    queryKey: ['ideas-hub-metrics'],
    queryFn: async () => {
      // Get counts
      const [ideasRes, initiativesRes, scoresRes] = await Promise.all([
        supabase.from('improvement_ideas').select('id, status, converted_to_br_id', { count: 'exact' }).is('deleted_at', null),
        supabase.from('improvement_initiatives').select('id', { count: 'exact' }).in('status', ['active', 'collecting', 'evaluating']),
        supabase.from('impact_scores').select('calculated_score').eq('is_current', true),
      ]);

      const ideas = ideasRes.data || [];
      const totalIdeas = ideas.length;
      const pendingReview = ideas.filter(i => ['submitted', 'under_review'].includes(i.status)).length;
      const converted = ideas.filter(i => i.converted_to_br_id).length;
      const conversionRate = totalIdeas > 0 ? (converted / totalIdeas) * 100 : 0;
      
      const scores = (scoresRes.data || []).map(s => s.calculated_score).filter(Boolean) as number[];
      const avgImpactScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      return {
        totalIdeas,
        pendingReview,
        avgImpactScore: Math.round(avgImpactScore * 100) / 100,
        conversionRate: Math.round(conversionRate),
        activeInitiatives: initiativesRes.count || 0,
      } as IdeasHubMetrics;
    },
  });
}

// ============================================================
// VOTING
// ============================================================

export function useMyVote(ideaId: string | undefined) {
  return useQuery({
    queryKey: ['idea-vote', ideaId],
    queryFn: async () => {
      if (!ideaId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('idea_votes')
        .select('*')
        .eq('idea_id', ideaId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as IdeaVote | null;
    },
    enabled: !!ideaId,
  });
}

export function useCastIdeaVote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ideaId, voteType }: { ideaId: string; voteType: 'for' | 'against' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('idea_votes')
        .upsert({
          idea_id: ideaId,
          user_id: user.id,
          vote_type: voteType,
        }, { onConflict: 'idea_id,user_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { ideaId }) => {
      queryClient.invalidateQueries({ queryKey: ['idea-vote', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
    },
  });
}

export function useRemoveIdeaVote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ideaId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('idea_votes')
        .delete()
        .eq('idea_id', ideaId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: (_, ideaId) => {
      queryClient.invalidateQueries({ queryKey: ['idea-vote', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
    },
  });
}

// ============================================================
// MUTATIONS
// ============================================================

export function useCreateImprovementIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (idea: Partial<ImprovementIdea>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('improvement_ideas')
        .insert({
          ...idea,
          submitter_id: user?.id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['ideas-hub-metrics'] });
    },
  });
}

export function useUpdateImprovementIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ImprovementIdea> & { id: string }) => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', data.id] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
    },
  });
}
