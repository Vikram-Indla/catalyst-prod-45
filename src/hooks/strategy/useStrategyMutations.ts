/**
 * Strategy Room — Mutation hooks for es_* tables
 * Uses @tanstack/react-query useMutation with cache invalidation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Vision ──

export function useUpdateVision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('es_visions')
        .update({ title, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'vision'] });
    },
  });
}

// ── Goals ──

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; status?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('es_goals')
        .update({ ...updates, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'goals'] });
      qc.invalidateQueries({ queryKey: ['strategy', 'okr-tree'] });
      qc.invalidateQueries({ queryKey: ['strategy', 'pyramid'] });
    },
  });
}

// ── Key Results ──

export function useUpdateKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; progress_pct?: number; status?: string; current_value?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('es_key_results')
        .update({ ...updates, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'key-results'] });
      qc.invalidateQueries({ queryKey: ['strategy', 'okr-heatmap'] });
      qc.invalidateQueries({ queryKey: ['strategy', 'okr-tree'] });
    },
  });
}

// ── KR Check-ins ──

export function useCreateKrCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (checkin: { key_result_id: string; value: number; previous_value?: number; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('es_kr_checkins')
        .insert({ ...checkin, author_id: user?.id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'kr-checkins'] });
      qc.invalidateQueries({ queryKey: ['strategy', 'key-results'] });
      qc.invalidateQueries({ queryKey: ['strategy', 'goals'] });
    },
  });
}

// ── AI Recommendations ──

export function useAcceptRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('es_ai_recommendations')
        .update({ status: 'accepted', accepted_by: user?.id, accepted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'recommendations'] });
      qc.invalidateQueries({ queryKey: ['strategy', 'health-composite'] });
    },
  });
}

export function useDismissRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('es_ai_recommendations')
        .update({ status: 'dismissed', dismissed_by: user?.id, dismissed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'recommendations'] });
    },
  });
}

// ── Snapshots ──

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (snapshot: { title: string; description?: string; data_json: Record<string, unknown>; snapshot_type?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('es_snapshots')
        .insert({
          title: snapshot.title,
          description: snapshot.description ?? null,
          data_json: snapshot.data_json as import('@/integrations/supabase/types').Json,
          snapshot_type: snapshot.snapshot_type ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'snapshots'] });
    },
  });
}

// ── Investment Allocations ──

export function useUpdateInvestmentAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, allocated_pct, allocated_amount }: { id: string; allocated_pct?: number; allocated_amount?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('es_investment_allocations')
        .update({ allocated_pct, allocated_amount, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'investments'] });
    },
  });
}

// ── Strategy Roles (Admin only) ──

export function useUpdateStrategyRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { data, error } = await supabase
        .from('es_strategy_roles')
        .update({ role })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy', 'role'] });
    },
  });
}
