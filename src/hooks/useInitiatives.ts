import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Initiative, InitiativeStatus } from '@/types/initiative';

/**
 * Fetches initiatives from ph_initiatives_list view (joins initiatives + departments + scores).
 * Filters out archived items by default.
 */
export function useInitiatives() {
  return useQuery({
    queryKey: ['ph-initiatives'],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('ph_initiatives_list' as any)
        .select('*', { count: 'exact' })
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (error) throw new Error(error.message);

      // Map DB rows to Initiative type
      const initiatives: Initiative[] = (data ?? []).map((row: any) => ({
        id: row.id,
        initiative_key: row.initiative_key,
        title: row.title,
        description: row.description,
        status: row.status as InitiativeStatus,
        assignee_id: row.assignee_id,
        assignee_name: null, // No profile join yet
        assignee_avatar: null,
        business_owner_id: row.business_owner_id,
        business_owner_name: null,
        reporter_id: row.reporter_id,
        department_id: row.department_id,
        department_name: row.department_name,
        target_quarter: row.target_quarter,
        business_ask_date: row.business_ask_date,
        kickoff_date: row.kickoff_date,
        target_complete: row.target_complete,
        progress: row.progress ?? 0,
        sort_order: row.sort_order ?? 0,
        risk_count: row.risk_count ?? 0,
        is_archived: row.is_archived ?? false,
        is_favorited: false, // Favorites require auth context
        score_strategic_alignment: row.score_strategic_alignment ? Number(row.score_strategic_alignment) : null,
        score_business_impact: row.score_business_impact ? Number(row.score_business_impact) : null,
        score_time_urgency: row.score_time_urgency ? Number(row.score_time_urgency) : null,
        score_resource_feasibility: row.score_resource_feasibility ? Number(row.score_resource_feasibility) : null,
        computed_score: row.computed_score ? Number(row.computed_score) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return { data: initiatives, count: count ?? initiatives.length };
    },
  });
}

/**
 * Updates a single initiative by ID.
 */
export function useUpdateInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('ph_initiatives')
        .update(updates)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
    },
  });
}

/**
 * Upserts initiative scores (strategic_alignment, business_impact, time_urgency, resource_feasibility).
 */
export function useUpdateScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      initiativeId,
      scores,
    }: {
      initiativeId: string;
      scores: {
        strategic_alignment: number;
        business_impact: number;
        time_urgency: number;
        resource_feasibility: number;
      };
    }) => {
      const { error } = await supabase
        .from('ph_initiative_scores')
        .upsert(
          { initiative_id: initiativeId, ...scores },
          { onConflict: 'initiative_id' }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
    },
  });
}

/**
 * Toggles a user's favorite on an initiative.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ initiativeId, isFavorited }: { initiativeId: string; isFavorited: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isFavorited) {
        const { error } = await supabase
          .from('ph_user_favorites')
          .delete()
          .match({ user_id: user.id, initiative_id: initiativeId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('ph_user_favorites')
          .insert({ user_id: user.id, initiative_id: initiativeId });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
    },
  });
}
