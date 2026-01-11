// ============================================================
// QUICK WINS HOOKS
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ImprovementIdea, ImpactScore, ImprovementIdeaCategory, IdeaType } from '@/types/improvement-ideas';

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

function toIdea(row: Record<string, unknown>): ImprovementIdea {
  let impactScore: ImpactScore | undefined;
  if (Array.isArray(row.impact_score)) {
    const current = row.impact_score.find((s: Record<string, unknown>) => s.is_current);
    impactScore = toImpactScore(current || row.impact_score[0] || null);
  } else if (row.impact_score && typeof row.impact_score === 'object') {
    impactScore = toImpactScore(row.impact_score as Record<string, unknown>);
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
    status: row.status as ImprovementIdea['status'],
    idea_type: (row.idea_type as IdeaType) || 'standard',
    triaged_at: row.triaged_at as string | undefined,
    triaged_by: row.triaged_by as string | undefined,
    triage_notes: row.triage_notes as string | undefined,
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
    ai_suggested_type: row.ai_suggested_type as IdeaType | undefined,
    business_request_id: row.business_request_id as string | undefined,
    converted_at: row.converted_at as string | undefined,
    converted_by: row.converted_by as string | undefined,
    conversion_notes: row.conversion_notes as string | undefined,
    source_type: (row.source_type as 'direct' | 'initiative') || 'direct',
    converted_to_br_id: row.converted_to_br_id as string | undefined,
    submitted_at: row.submitted_at as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: row.deleted_at as string | undefined,
    impact_score: impactScore,
  };
}

export function useQuickWins() {
  return useQuery({
    queryKey: ['quick-wins'],
    queryFn: async () => {
      // Use filter on column that may not be in generated types yet
      const { data, error } = await supabase
        .from('improvement_ideas')
        .select(`*, impact_score:impact_scores(*)`)
        .filter('idea_type', 'eq', 'quick_win')
        .neq('status', 'converted')
        .is('deleted_at', null)
        .order('for_votes', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(row => toIdea(row as unknown as Record<string, unknown>));
    },
  });
}

export function useQuickWinsPending() {
  return useQuery({
    queryKey: ['quick-wins-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .select(`*, impact_score:impact_scores(*)`)
        .filter('idea_type', 'eq', 'quick_win')
        .in('status', ['under_review', 'scoring'])
        .is('deleted_at', null)
        .order('for_votes', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(row => toIdea(row as unknown as Record<string, unknown>));
    },
  });
}

export function useQuickWinsApproved() {
  return useQuery({
    queryKey: ['quick-wins-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .select(`*, impact_score:impact_scores(*)`)
        .filter('idea_type', 'eq', 'quick_win')
        .eq('status', 'approved')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(row => toIdea(row as unknown as Record<string, unknown>));
    },
  });
}

export function useUnlinkedStrategicIdeas() {
  return useQuery({
    queryKey: ['unlinked-strategic-ideas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .select(`*, impact_score:impact_scores(*)`)
        .filter('idea_type', 'eq', 'strategic')
        .is('initiative_id', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(row => toIdea(row as unknown as Record<string, unknown>));
    },
  });
}

export function useIdeasAwaitingTriage() {
  return useQuery({
    queryKey: ['ideas-awaiting-triage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .select(`*, impact_score:impact_scores(*)`)
        .in('status', ['submitted', 'under_review'])
        .filter('idea_type', 'eq', 'standard')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(row => toIdea(row as unknown as Record<string, unknown>));
    },
  });
}
