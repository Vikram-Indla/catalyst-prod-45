import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface CapacityScenario {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'snapshot';
  time_scope: string;
  start_date: string;
  end_date: string;
  baseline_snapshot: Json | null;
  modifications: Json | null;
  metrics: {
    totalResources?: number;
    available?: number;
    atCapacity?: number;
    overAllocated?: number;
    avgUtilization?: number;
  } | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface CreateScenarioInput {
  name: string;
  description?: string;
  time_scope: 'release' | 'custom';
  start_date: string;
  end_date: string;
  metrics?: CapacityScenario['metrics'];
}

export function useCapacityScenarios() {
  const queryClient = useQueryClient();

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['capacity-scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(s => ({
        ...s,
        metrics: s.metrics as CapacityScenario['metrics'],
      })) as CapacityScenario[];
    },
  });

  const createScenario = useMutation({
    mutationFn: async (input: CreateScenarioInput) => {
      const metricsData = input.metrics || { totalResources: 26, available: 4, atCapacity: 19, overAllocated: 3, avgUtilization: 93 };
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .insert({
          name: input.name,
          description: input.description || null,
          status: 'draft',
          time_scope: input.time_scope,
          start_date: input.start_date,
          end_date: input.end_date,
          metrics: metricsData as unknown as Json,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, metrics: data.metrics as CapacityScenario['metrics'] } as CapacityScenario;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capacity-scenarios'] });
      toast.success(`Scenario "${data.name}" created successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to create scenario: ${error.message}`);
    },
  });

  const updateScenario = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<CapacityScenario, 'id'>> }) => {
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .update({ 
          ...updates, 
          metrics: updates.metrics as unknown as Json,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, metrics: data.metrics as CapacityScenario['metrics'] } as CapacityScenario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-scenarios'] });
    },
    onError: (error) => {
      toast.error(`Failed to update scenario: ${error.message}`);
    },
  });

  const activateScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      // First, deactivate current active scenario
      await supabase
        .from('capacity_scenarios')
        .update({ status: 'draft' })
        .eq('status', 'active');
      
      // Then activate the selected one
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', scenarioId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, metrics: data.metrics as CapacityScenario['metrics'] } as CapacityScenario;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capacity-scenarios'] });
      toast.success(`Scenario "${data.name}" is now active`);
    },
    onError: (error) => {
      toast.error(`Failed to activate scenario: ${error.message}`);
    },
  });

  const duplicateScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      const original = scenarios.find(s => s.id === scenarioId);
      if (!original) throw new Error('Scenario not found');
      
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .insert({
          name: `${original.name} (Copy)`,
          description: original.description,
          status: 'draft',
          time_scope: original.time_scope,
          start_date: original.start_date,
          end_date: original.end_date,
          baseline_snapshot: original.baseline_snapshot,
          modifications: original.modifications,
          metrics: original.metrics as unknown as Json,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, metrics: data.metrics as CapacityScenario['metrics'] } as CapacityScenario;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capacity-scenarios'] });
      toast.success(`Scenario duplicated as "${data.name}"`);
    },
    onError: (error) => {
      toast.error(`Failed to duplicate scenario: ${error.message}`);
    },
  });

  const createSnapshot = useMutation({
    mutationFn: async (scenarioId: string) => {
      const original = scenarios.find(s => s.id === scenarioId);
      if (!original) throw new Error('Scenario not found');
      
      const { data, error } = await supabase
        .from('capacity_scenarios')
        .insert({
          name: `${original.name} - Snapshot ${new Date().toLocaleDateString()}`,
          description: `Snapshot of ${original.name}`,
          status: 'snapshot',
          time_scope: original.time_scope,
          start_date: original.start_date,
          end_date: original.end_date,
          baseline_snapshot: original.metrics as unknown as Json,
          modifications: null,
          metrics: original.metrics as unknown as Json,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, metrics: data.metrics as CapacityScenario['metrics'] } as CapacityScenario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-scenarios'] });
      toast.success('Snapshot created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create snapshot: ${error.message}`);
    },
  });

  const restoreSnapshot = useMutation({
    mutationFn: async (snapshotId: string) => {
      const snapshot = scenarios.find(s => s.id === snapshotId);
      if (!snapshot) throw new Error('Snapshot not found');
      
      // Find active scenario and update its metrics from snapshot
      const activeScenario = scenarios.find(s => s.status === 'active');
      if (activeScenario) {
        const restoredMetrics = (snapshot.baseline_snapshot || snapshot.metrics) as unknown as Json;
        const { error } = await supabase
          .from('capacity_scenarios')
          .update({ 
            metrics: restoredMetrics,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeScenario.id);
        
        if (error) throw error;
      }
      
      return snapshot;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capacity-scenarios'] });
      toast.success(`Restored from snapshot "${data.name}"`);
    },
    onError: (error) => {
      toast.error(`Failed to restore snapshot: ${error.message}`);
    },
  });

  const deleteScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      const { error } = await supabase
        .from('capacity_scenarios')
        .delete()
        .eq('id', scenarioId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-scenarios'] });
      toast.success('Scenario deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete scenario: ${error.message}`);
    },
  });

  // Get active scenario
  const activeScenario = scenarios.find(s => s.status === 'active');
  
  // Get draft scenarios
  const draftScenarios = scenarios.filter(s => s.status === 'draft');

  return {
    scenarios,
    activeScenario,
    draftScenarios,
    isLoading,
    createScenario,
    updateScenario,
    activateScenario,
    duplicateScenario,
    createSnapshot,
    restoreSnapshot,
    deleteScenario,
  };
}
