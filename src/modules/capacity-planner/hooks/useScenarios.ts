import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateScenarioInput {
  name: string;
  description?: string;
  status?: string;
  time_scope: string;
  start_date: string;
  end_date: string;
  baseline_snapshot?: Record<string, unknown>;
  modifications?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

interface UpdateScenarioInput {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  time_scope?: string;
  start_date?: string;
  end_date?: string;
  baseline_snapshot?: Record<string, unknown>;
  modifications?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

export function useScenarios() {
  const queryClient = useQueryClient();

  const createScenario = useMutation({
    mutationFn: async (scenario: CreateScenarioInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .insert({
          name: scenario.name,
          description: scenario.description,
          status: scenario.status || 'draft',
          time_scope: scenario.time_scope,
          start_date: scenario.start_date,
          end_date: scenario.end_date,
          baseline_snapshot: scenario.baseline_snapshot as unknown as null,
          modifications: scenario.modifications as unknown as null,
          metrics: scenario.metrics as unknown as null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-scenarios'] });
      toast.success('Scenario created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create scenario: ${error.message}`);
    },
  });

  const updateScenario = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateScenarioInput) => {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.time_scope !== undefined) updateData.time_scope = updates.time_scope;
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
      if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
      if (updates.baseline_snapshot !== undefined) updateData.baseline_snapshot = updates.baseline_snapshot;
      if (updates.modifications !== undefined) updateData.modifications = updates.modifications;
      if (updates.metrics !== undefined) updateData.metrics = updates.metrics;

      const { data, error } = await supabase
        .from('capacity_scenarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-scenarios'] });
      toast.success('Scenario updated');
    },
    onError: (error) => {
      toast.error(`Failed to update scenario: ${error.message}`);
    },
  });

  const approveScenario = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-scenarios'] });
      toast.success('Scenario approved');
    },
    onError: (error) => {
      toast.error(`Failed to approve scenario: ${error.message}`);
    },
  });

  const deleteScenario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('capacity_scenarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-scenarios'] });
      toast.success('Scenario deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete scenario: ${error.message}`);
    },
  });

  return {
    createScenario,
    updateScenario,
    approveScenario,
    deleteScenario,
  };
}
