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
  ImprovementIdeaCategory,
  ImprovementInitiativeSettings
} from '@/types/improvement-ideas';
import type { Json } from '@/integrations/supabase/types';

// ============================================================
// TYPE HELPERS
// ============================================================

// Helper to safely parse initiative settings from Json
function parseInitiativeSettings(settings: Json | null): ImprovementInitiativeSettings {
  const defaults: ImprovementInitiativeSettings = {
    require_arabic: false,
    allow_anonymous: false,
    moderation_required: true,
    max_ideas_per_user: 10,
    voting_enabled: true,
    comments_enabled: true,
  };
  
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return defaults;
  }
  
  const s = settings as Record<string, Json>;
  return {
    require_arabic: typeof s.require_arabic === 'boolean' ? s.require_arabic : defaults.require_arabic,
    allow_anonymous: typeof s.allow_anonymous === 'boolean' ? s.allow_anonymous : defaults.allow_anonymous,
    moderation_required: typeof s.moderation_required === 'boolean' ? s.moderation_required : defaults.moderation_required,
    max_ideas_per_user: typeof s.max_ideas_per_user === 'number' ? s.max_ideas_per_user : defaults.max_ideas_per_user,
    voting_enabled: typeof s.voting_enabled === 'boolean' ? s.voting_enabled : defaults.voting_enabled,
    comments_enabled: typeof s.comments_enabled === 'boolean' ? s.comments_enabled : defaults.comments_enabled,
  };
}

// Transform DB row to ImprovementInitiative
function toInitiative(row: Record<string, unknown>): ImprovementInitiative {
  return {
    id: row.id as string,
    code: row.code as string,
    title: row.title as string,
    title_ar: row.title_ar as string | undefined,
    description: row.description as string | undefined,
    description_ar: row.description_ar as string | undefined,
    status: row.status as ImprovementInitiative['status'],
    visibility: row.visibility as ImprovementInitiative['visibility'],
    voting_type: row.voting_type as ImprovementInitiative['voting_type'],
    start_date: row.start_date as string | undefined,
    end_date: row.end_date as string | undefined,
    owner_id: row.owner_id as string | undefined,
    product_id: row.product_id as string | undefined,
    settings: parseInitiativeSettings(row.settings as Json),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: row.deleted_at as string | undefined,
  };
}

// Transform DB row to ImpactScore
function toImpactScore(row: Record<string, unknown> | null): ImpactScore | undefined {
  if (!row) return undefined;
  return {
    id: row.id as string,
    idea_id: row.idea_id as string,
    imperative: row.imperative as number | undefined,
    ministry_efficiency: row.ministry_efficiency as number | undefined,
    pain_severity: row.pain_severity as number | undefined,
    alignment: row.alignment as number | undefined,
    complexity: row.complexity as number | undefined,
    timeframe: row.timeframe as number | undefined,
    calculated_score: row.calculated_score as number | undefined,
    justification: row.justification as string | undefined,
    scored_by: row.scored_by as string | undefined,
    ai_assisted: row.ai_assisted as boolean,
    version: row.version as number,
    is_current: row.is_current as boolean,
    created_at: row.created_at as string,
  };
}

// Transform DB row to ImprovementIdea
function toIdea(row: Record<string, unknown>): ImprovementIdea {
  // Handle impact_score - could be array or single object
  let impactScore: ImpactScore | undefined;
  if (Array.isArray(row.impact_score)) {
    const current = row.impact_score.find((s: Record<string, unknown>) => s.is_current);
    impactScore = toImpactScore(current || row.impact_score[0] || null);
  } else if (row.impact_score && typeof row.impact_score === 'object') {
    impactScore = toImpactScore(row.impact_score as Record<string, unknown>);
  }

  // Handle initiative relation
  let initiative: ImprovementInitiative | undefined;
  if (row.initiative && typeof row.initiative === 'object' && !Array.isArray(row.initiative)) {
    initiative = toInitiative(row.initiative as Record<string, unknown>);
  }

  return {
    id: row.id as string,
    code: row.code as string,
    initiative_id: row.initiative_id as string | undefined,
    title: row.title as string,
    title_ar: row.title_ar as string | undefined,
    description: row.description as string,
    description_ar: row.description_ar as string | undefined,
    category: row.category as ImprovementIdeaCategory,
    status: row.status as ImprovementIdeaStatus,
    submitter_id: row.submitter_id as string | undefined,
    submitter_type: row.submitter_type as ImprovementIdea['submitter_type'],
    submitter_name: row.submitter_name as string | undefined,
    submitter_email: row.submitter_email as string | undefined,
    is_anonymous: row.is_anonymous as boolean,
    for_votes: row.for_votes as number,
    against_votes: row.against_votes as number,
    total_votes: row.total_votes as number,
    ai_category: row.ai_category as ImprovementIdeaCategory | undefined,
    ai_compliance_tags: (row.ai_compliance_tags as string[]) || [],
    ai_v2030_mapping: (row.ai_v2030_mapping as string[]) || [],
    ai_duplicate_ids: (row.ai_duplicate_ids as string[]) || [],
    ai_summary: row.ai_summary as string | undefined,
    ai_summary_ar: row.ai_summary_ar as string | undefined,
    converted_to_br_id: row.converted_to_br_id as string | undefined,
    converted_at: row.converted_at as string | undefined,
    converted_by: row.converted_by as string | undefined,
    submitted_at: row.submitted_at as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: row.deleted_at as string | undefined,
    initiative,
    impact_score: impactScore,
  };
}

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
      return (data || []).map(row => toInitiative(row as unknown as Record<string, unknown>));
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
      return toInitiative(data as unknown as Record<string, unknown>);
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
          initiative:improvement_initiatives(id, code, title, status, visibility, voting_type, settings, created_at, updated_at),
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
      
      return (data || []).map(row => toIdea(row as unknown as Record<string, unknown>));
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
      return toIdea(data as unknown as Record<string, unknown>);
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
          impact_score:impact_scores(*)
        `)
        .is('deleted_at', null)
        .in('status', ['submitted', 'under_review', 'scoring', 'approved'])
        .order('for_votes', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []).map(row => toIdea(row as unknown as Record<string, unknown>));
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

interface CreateIdeaInput {
  initiative_id?: string;
  title: string;
  title_ar?: string;
  description: string;
  description_ar?: string;
  category: ImprovementIdeaCategory;
  submitter_type?: ImprovementIdea['submitter_type'];
  submitter_name?: string;
  submitter_email?: string;
  is_anonymous?: boolean;
}

export function useCreateImprovementIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (idea: CreateIdeaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('improvement_ideas')
        .insert({
          initiative_id: idea.initiative_id,
          title: idea.title,
          title_ar: idea.title_ar,
          description: idea.description,
          description_ar: idea.description_ar,
          category: idea.category,
          submitter_id: user?.id,
          submitter_type: idea.submitter_type || 'employee',
          submitter_name: idea.submitter_name,
          submitter_email: idea.submitter_email,
          is_anonymous: idea.is_anonymous || false,
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

interface UpdateIdeaInput {
  id: string;
  title?: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  category?: ImprovementIdeaCategory;
  status?: ImprovementIdeaStatus;
}

export function useUpdateImprovementIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateIdeaInput) => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
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
