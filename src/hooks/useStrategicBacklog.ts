import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type {
  StrategyMission,
  StrategyVision,
  StrategyValue,
  StrategicGoal,
  StrategicTheme,
  SnapshotStrategyLinks,
  CreateMissionInput,
  CreateVisionInput,
  CreateValueInput,
  CreateGoalInput,
  CreateThemeInput,
} from '@/types/strategicBacklog';

// ============ MISSIONS ============
export function useStrategyMissions() {
  return useQuery({
    queryKey: ['strategy-missions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_missions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as StrategyMission[];
    },
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMissionInput) => {
      const { data, error } = await supabase
        .from('strategy_missions')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as StrategyMission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-missions'] });
      catalystToast.success('Mission Created', 'Mission has been created successfully.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to create mission.');
    },
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<StrategyMission> & { id: string }) => {
      const { data, error } = await supabase
        .from('strategy_missions')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as StrategyMission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-missions'] });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('strategy_missions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-missions'] });
      catalystToast.success('Mission Deleted', 'Mission has been deleted.');
    },
  });
}

// ============ VISIONS ============
export function useStrategyVisions() {
  return useQuery({
    queryKey: ['strategy-visions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_visions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as StrategyVision[];
    },
  });
}

export function useCreateVision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVisionInput) => {
      const { data, error } = await supabase
        .from('strategy_visions')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as StrategyVision;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-visions'] });
      catalystToast.success('Vision Created', 'Vision has been created successfully.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to create vision.');
    },
  });
}

export function useUpdateVision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<StrategyVision> & { id: string }) => {
      const { data, error } = await supabase
        .from('strategy_visions')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as StrategyVision;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-visions'] });
    },
  });
}

export function useDeleteVision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('strategy_visions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-visions'] });
      catalystToast.success('Vision Deleted', 'Vision has been deleted.');
    },
  });
}

// ============ VALUES ============
export function useStrategyValues() {
  return useQuery({
    queryKey: ['strategy-values'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_values')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as StrategyValue[];
    },
  });
}

export function useCreateValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateValueInput) => {
      const { data, error } = await supabase
        .from('strategy_values')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as StrategyValue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-values'] });
      catalystToast.success('Value Created', 'Value has been created successfully.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to create value.');
    },
  });
}

export function useUpdateValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<StrategyValue> & { id: string }) => {
      const { data, error } = await supabase
        .from('strategy_values')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as StrategyValue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-values'] });
    },
  });
}

export function useDeleteValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('strategy_values').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-values'] });
      catalystToast.success('Value Deleted', 'Value has been deleted.');
    },
  });
}

// ============ GOALS ============
export function useStrategicGoals(snapshotId?: string) {
  return useQuery({
    queryKey: ['strategic-goals', snapshotId],
    queryFn: async () => {
      let query = supabase
        .from('strategic_goals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (snapshotId) {
        query = query.eq('snapshot_id', snapshotId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StrategicGoal[];
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { data, error } = await supabase
        .from('strategic_goals')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as StrategicGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-goals'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-pyramid-counts'] });
      catalystToast.success('Goal Created', 'Strategic goal has been created.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to create goal.');
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<StrategicGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('strategic_goals')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as StrategicGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-goals'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-pyramid-counts'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('strategic_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-goals'] });
      catalystToast.success('Goal Deleted', 'Strategic goal has been deleted.');
    },
  });
}

// ============ THEMES ============
export function useStrategicThemes(snapshotId?: string) {
  return useQuery({
    queryKey: ['strategic-themes', snapshotId],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (snapshotId) {
        query = query.eq('snapshot_id', snapshotId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StrategicTheme[];
    },
    enabled: !!snapshotId,
  });
}

export function useCreateTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateThemeInput) => {
      // Map our status to DB status
      const dbInput = {
        ...input,
        status: input.status === 'archived' ? 'done' : input.status === 'draft' ? 'proposed' : 'active',
      };
      const { data, error } = await supabase
        .from('strategic_themes')
        .insert(dbInput as any)
        .select()
        .single();
      if (error) throw error;
      return data as StrategicTheme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-pyramid-counts'] });
      catalystToast.success('Theme Created', 'Strategic theme has been created.');
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to create theme.');
    },
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<StrategicTheme> & { id: string }) => {
      // Map our status to DB status
      const dbInput: any = { ...input };
      if (input.status) {
        dbInput.status = input.status === 'archived' ? 'done' : input.status === 'draft' ? 'proposed' : 'active';
      }
      const { data, error } = await supabase
        .from('strategic_themes')
        .update(dbInput)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as StrategicTheme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
    },
  });
}

export function useDeleteTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('strategic_themes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      catalystToast.success('Theme Deleted', 'Strategic theme has been deleted.');
    },
  });
}

// ============ SNAPSHOT LINKS ============
export function useSnapshotStrategyLinks(snapshotId?: string) {
  return useQuery({
    queryKey: ['snapshot-strategy-links', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return null;
      const { data, error } = await supabase
        .from('snapshot_strategy_links')
        .select('*')
        .eq('snapshot_id', snapshotId)
        .maybeSingle();
      if (error) throw error;
      return data as SnapshotStrategyLinks | null;
    },
    enabled: !!snapshotId,
  });
}

export function useUpsertSnapshotLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SnapshotStrategyLinks> & { snapshot_id: string }) => {
      const { data, error } = await supabase
        .from('snapshot_strategy_links')
        .upsert(input, { onConflict: 'snapshot_id' })
        .select()
        .single();
      if (error) throw error;
      return data as SnapshotStrategyLinks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshot-strategy-links'] });
    },
  });
}

// Helper to check if snapshot can be activated (has at least 1 theme)
export function canActivateSnapshot(links: SnapshotStrategyLinks | null, themes: StrategicTheme[]): boolean {
  return themes.length > 0;
}
