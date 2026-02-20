import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIBriefRecord {
  id: string;
  scope: string;
  scope_entity_id: string | null;
  brief_json: any;
  metrics_json: any;
  status: 'draft' | 'published' | 'archived' | 'discarded';
  version: number;
  generated_at: string;
  generated_by: string;
  published_at: string | null;
  published_by: string | null;
}

/**
 * Fetch the currently published brief for a given scope.
 * This is what ALL regular users see — same data for everyone.
 */
export function usePublishedBrief(scope: string, entityId?: string) {
  return useQuery({
    queryKey: ['ai-brief', scope, entityId || 'global'],
    queryFn: async (): Promise<AIBriefRecord | null> => {
      let query = (supabase as any)
        .from('ai_briefs')
        .select('*')
        .eq('scope', scope)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1);

      if (entityId) {
        query = query.eq('scope_entity_id', entityId);
      } else {
        query = query.is('scope_entity_id', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error('Failed to fetch published brief:', error);
      }
      return data || null;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Fetch the latest draft brief (admin only).
 */
export function useDraftBrief(scope: string, entityId?: string) {
  return useQuery({
    queryKey: ['ai-brief-draft', scope, entityId || 'global'],
    queryFn: async (): Promise<AIBriefRecord | null> => {
      let query = (supabase as any)
        .from('ai_briefs')
        .select('*')
        .eq('scope', scope)
        .eq('status', 'draft')
        .order('generated_at', { ascending: false })
        .limit(1);

      if (entityId) {
        query = query.eq('scope_entity_id', entityId);
      } else {
        query = query.is('scope_entity_id', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error('Failed to fetch draft brief:', error);
      }
      return data || null;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Publish a draft brief (admin only).
 */
export function usePublishBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (briefId: string) => {
      const { error } = await supabase.rpc('publish_ai_brief', {
        brief_id: briefId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-brief'] });
      queryClient.invalidateQueries({ queryKey: ['ai-brief-draft'] });
    },
  });
}

/**
 * Generate a new draft brief (admin only).
 */
export function useGenerateBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scope,
      entityId,
      metricsJson,
      generateFn,
    }: {
      scope: string;
      entityId?: string;
      metricsJson: any;
      generateFn: (metrics: any) => Promise<any>;
    }) => {
      const briefJson = await generateFn(metricsJson);

      const { data, error } = await (supabase as any)
        .from('ai_briefs')
        .insert({
          scope,
          scope_entity_id: entityId || null,
          brief_json: briefJson,
          metrics_json: metricsJson,
          status: 'draft',
          generated_by: (await supabase.auth.getUser()).data.user?.id || 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-brief-draft'] });
    },
  });
}

/**
 * Discard a draft brief (admin only).
 */
export function useDiscardBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (briefId: string) => {
      const { error } = await (supabase as any)
        .from('ai_briefs')
        .update({ status: 'discarded', updated_at: new Date().toISOString() })
        .eq('id', briefId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-brief-draft'] });
    },
  });
}

/**
 * Fetch brief history for a scope (admin only).
 */
export function useBriefHistory(scope: string, entityId?: string) {
  return useQuery({
    queryKey: ['ai-brief-history', scope, entityId || 'global'],
    queryFn: async (): Promise<AIBriefRecord[]> => {
      let query = (supabase as any)
        .from('ai_briefs')
        .select('*')
        .eq('scope', scope)
        .in('status', ['published', 'archived'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (entityId) {
        query = query.eq('scope_entity_id', entityId);
      } else {
        query = query.is('scope_entity_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}
