/**
 * Strategy Room — Read hooks for all es_* tables and views
 * Uses @tanstack/react-query with Supabase client
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  EsMission, EsVision, EsStrategicTheme, EsGoal, EsKeyResult,
  EsInitiative, EsInitiativeEpic, EsKrCheckin, EsHealthScore,
  EsAiRecommendation, EsSnapshot, EsTeamAlignment,
  EsInvestmentAllocation, EsStrategyRoleRecord,
  EsDashboardPyramidSummary, EsDashboardOkrHeatmap, EsDashboardOkrTree,
  EsDashboardExecutionDials, EsDashboardHealthComposite, EsDashboardTeamAlignment,
} from '@/types/strategy';

// ── Layer Hooks ──

export function useMission() {
  return useQuery({
    queryKey: ['strategy', 'mission'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_missions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as EsMission | null;
    },
  });
}

export function useVision() {
  return useQuery({
    queryKey: ['strategy', 'vision'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_visions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as EsVision | null;
    },
  });
}

export function useStrategicThemes() {
  return useQuery({
    queryKey: ['strategy', 'themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_strategic_themes')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsStrategicTheme[];
    },
  });
}

export function useGoals(themeId?: string) {
  return useQuery({
    queryKey: ['strategy', 'goals', themeId],
    queryFn: async () => {
      let query = supabase.from('es_goals').select('*');
      if (themeId) query = query.eq('theme_id', themeId);
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsGoal[];
    },
  });
}

export function useKeyResults(goalId?: string) {
  return useQuery({
    queryKey: ['strategy', 'key-results', goalId],
    queryFn: async () => {
      let query = supabase.from('es_key_results').select('*');
      if (goalId) query = query.eq('goal_id', goalId);
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsKeyResult[];
    },
  });
}

export function useEsInitiatives(keyResultId?: string) {
  return useQuery({
    queryKey: ['strategy', 'initiatives', keyResultId],
    queryFn: async () => {
      let query = supabase.from('es_initiatives').select('*');
      if (keyResultId) query = query.eq('key_result_id', keyResultId);
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsInitiative[];
    },
  });
}

export function useRequestEpics(requestId: string) {
  return useQuery({
    queryKey: ['strategy', 'initiative-epics', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('es_initiative_epics')
        .select('*')
        .eq('request_id', requestId);
      if (error) throw new Error(error.message);
      return (data ?? []) as EsInitiativeEpic[];
    },
  });
}

// ── Supporting Data Hooks ──

export function useKrCheckins(keyResultId: string) {
  return useQuery({
    queryKey: ['strategy', 'kr-checkins', keyResultId],
    enabled: !!keyResultId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_kr_checkins')
        .select('*')
        .eq('key_result_id', keyResultId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsKrCheckin[];
    },
  });
}

export function useHealthScore() {
  return useQuery({
    queryKey: ['strategy', 'health-score'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_health_scores')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as EsHealthScore | null;
    },
  });
}

export function useAiRecommendations() {
  return useQuery({
    queryKey: ['strategy', 'recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_ai_recommendations')
        .select('*')
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsAiRecommendation[];
    },
  });
}

export function useSnapshots() {
  return useQuery({
    queryKey: ['strategy', 'snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_snapshots')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsSnapshot[];
    },
  });
}

export function useTeamAlignment() {
  return useQuery({
    queryKey: ['strategy', 'team-alignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_team_alignment')
        .select('*')
        .order('workstream', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsTeamAlignment[];
    },
  });
}

export function useInvestmentAllocations() {
  return useQuery({
    queryKey: ['strategy', 'investments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_investment_allocations')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsInvestmentAllocation[];
    },
  });
}

export function useStrategyRoleForUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['strategy', 'role', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_strategy_roles')
        .select('*')
        .eq('user_id', userId!)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as EsStrategyRoleRecord | null;
    },
  });
}

// ── Dashboard View Hooks ──

export function usePyramidSummary() {
  return useQuery({
    queryKey: ['strategy', 'pyramid'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_dashboard_pyramid_summary')
        .select('*')
        .order('layer_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EsDashboardPyramidSummary[];
    },
  });
}

export function useOkrHeatmap() {
  return useQuery({
    queryKey: ['strategy', 'okr-heatmap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_dashboard_okr_heatmap')
        .select('*');
      if (error) throw new Error(error.message);
      return (data ?? []) as EsDashboardOkrHeatmap[];
    },
  });
}

export function useOkrTree() {
  return useQuery({
    queryKey: ['strategy', 'okr-tree'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_dashboard_okr_tree')
        .select('*');
      if (error) throw new Error(error.message);
      return (data ?? []) as EsDashboardOkrTree[];
    },
  });
}

export function useExecutionDials() {
  return useQuery({
    queryKey: ['strategy', 'execution-dials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_dashboard_execution_dials')
        .select('*');
      if (error) throw new Error(error.message);
      return (data ?? []) as EsDashboardExecutionDials[];
    },
  });
}

export function useHealthComposite() {
  return useQuery({
    queryKey: ['strategy', 'health-composite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_dashboard_health_composite')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as EsDashboardHealthComposite | null;
    },
  });
}

export function useTeamAlignmentDashboard() {
  return useQuery({
    queryKey: ['strategy', 'team-alignment-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('es_dashboard_team_alignment')
        .select('*');
      if (error) throw new Error(error.message);
      return (data ?? []) as EsDashboardTeamAlignment[];
    },
  });
}
