// ============================================================================
// HOOK: useTestCyclesEnhanced
// Enhanced cycle fetching with release + assignee joins
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Cycle status type
export type CycleStatus = 'planned' | 'in_progress' | 'completed' | 'archived';

// Full cycle entity with joins
export interface CycleWithDetails {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: CycleStatus;
  environment: string;
  release_id: string | null;
  release: { id: string; name: string } | null;
  assigned_to: string | null;
  assignee: { id: string; full_name: string | null; avatar_url: string | null } | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// KPI summary
export interface CycleKPIs {
  totalCycles: number;
  inProgressCount: number;
  completedCount: number;
  passRate: number;
  avgDurationHours: number;
}

// Filter params
export interface CycleFilterParams {
  search?: string;
  releaseId?: string;
  status?: string;
  environment?: string;
}

// Create cycle input
export interface CreateCycleInput {
  name: string;
  description?: string;
  release_id?: string;
  environment: string;
  assigned_to?: string;
  planned_start?: string;
  planned_end?: string;
}

// ============================================================================
// Generate Cycle Key
// ============================================================================

async function generateCycleKey(projectId: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('tm_next_entity_key', {
      p_prefix: 'CY',
      p_project_id: projectId,
    });
    if (!error && data) return data;
  } catch {
    // Fallback below
  }

  const { count } = await supabase
    .from('tm_test_cycles')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const nextNum = (count || 0) + 1;
  return `CY-${String(nextNum).padStart(3, '0')}`;
}

// ============================================================================
// Fetch Cycles with Details
// ============================================================================

export function useTestCyclesEnhanced(projectId: string | undefined, filters?: CycleFilterParams) {
  return useQuery({
    queryKey: ['tm-cycles-enhanced', projectId, filters],
    queryFn: async (): Promise<CycleWithDetails[]> => {
      if (!projectId) return [];

      let query = supabase
        .from('tm_test_cycles')
        .select(`
          id,
          cycle_key,
          name,
          description,
          status,
          environment,
          release_id,
          release:releases(id, name),
          assigned_to,
          assignee:profiles!tm_test_cycles_assigned_to_fkey(id, full_name, avatar_url),
          planned_start,
          planned_end,
          actual_start,
          actual_end,
          total_cases,
          passed_count,
          failed_count,
          blocked_count,
          skipped_count,
          not_run_count,
          created_at,
          updated_at,
          created_by
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // Apply filters - cast to any for dynamic filter building
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }

      if (filters?.releaseId && filters.releaseId !== 'all') {
        query = query.eq('release_id', filters.releaseId);
      }

      if (filters?.environment && filters.environment !== 'all') {
        query = query.eq('environment', filters.environment);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,cycle_key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching cycles:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        key: row.cycle_key,
        name: row.name,
        description: row.description,
        status: row.status || 'planned',
        environment: row.environment || 'staging',
        release_id: row.release_id,
        release: row.release,
        assigned_to: row.assigned_to,
        assignee: row.assignee,
        planned_start: row.planned_start,
        planned_end: row.planned_end,
        actual_start: row.actual_start,
        actual_end: row.actual_end,
        total_cases: row.total_cases || 0,
        passed_count: row.passed_count || 0,
        failed_count: row.failed_count || 0,
        blocked_count: row.blocked_count || 0,
        skipped_count: row.skipped_count || 0,
        not_run_count: row.not_run_count || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
      }));
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}

// ============================================================================
// Compute KPIs from cycles
// ============================================================================

export function useCycleKPIs(cycles: CycleWithDetails[] | undefined): CycleKPIs {
  if (!cycles || cycles.length === 0) {
    return {
      totalCycles: 0,
      inProgressCount: 0,
      completedCount: 0,
      passRate: 0,
      avgDurationHours: 0,
    };
  }

  const totalCycles = cycles.length;
  const inProgressCount = cycles.filter(c => c.status === 'in_progress').length;

  // Completed this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedCount = cycles.filter(c => {
    if (c.status !== 'completed') return false;
    if (!c.actual_end) return false;
    const endDate = new Date(c.actual_end);
    return endDate >= startOfMonth;
  }).length;

  // Pass rate across all cycles
  const totalPassed = cycles.reduce((sum, c) => sum + c.passed_count, 0);
  const totalExecuted = cycles.reduce((sum, c) => sum + c.passed_count + c.failed_count + c.blocked_count, 0);
  const passRate = totalExecuted > 0 ? Math.round((totalPassed / totalExecuted) * 100) : 0;

  // Avg duration (for cycles with actual_start and actual_end)
  const completedCycles = cycles.filter(c => c.actual_start && c.actual_end);
  let avgDurationHours = 4.2; // Default
  if (completedCycles.length > 0) {
    const totalHours = completedCycles.reduce((sum, c) => {
      const start = new Date(c.actual_start!);
      const end = new Date(c.actual_end!);
      return sum + (end.getTime() - start.getTime()) / 3600000;
    }, 0);
    avgDurationHours = Math.round((totalHours / completedCycles.length) * 10) / 10;
  }

  return {
    totalCycles,
    inProgressCount,
    completedCount,
    passRate,
    avgDurationHours,
  };
}

// ============================================================================
// Create Cycle Mutation
// ============================================================================

export function useCreateCycleEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCycleInput & { project_id: string }): Promise<CycleWithDetails> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const cycleKey = await generateCycleKey(input.project_id);

      const { data, error } = await supabase
        .from('tm_test_cycles')
        .insert({
          project_id: input.project_id,
          cycle_key: cycleKey,
          name: input.name,
          description: input.description || null,
          status: 'planned',
          environment: input.environment || 'staging',
          release_id: input.release_id || null,
          assigned_to: input.assigned_to || null,
          planned_start: input.planned_start || null,
          planned_end: input.planned_end || null,
          created_by: user.id,
        })
        .select(`
          id,
          cycle_key,
          name,
          description,
          status,
          environment,
          release_id,
          release:releases(id, name),
          assigned_to,
          assignee:profiles!tm_test_cycles_assigned_to_fkey(id, full_name, avatar_url),
          planned_start,
          planned_end,
          actual_start,
          actual_end,
          total_cases,
          passed_count,
          failed_count,
          blocked_count,
          skipped_count,
          not_run_count,
          created_at,
          updated_at,
          created_by
        `)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        key: data.cycle_key,
        name: data.name,
        description: data.description,
        status: data.status || 'planned',
        environment: data.environment || 'staging',
        release_id: data.release_id,
        release: data.release as any,
        assigned_to: data.assigned_to,
        assignee: data.assignee as any,
        planned_start: data.planned_start,
        planned_end: data.planned_end,
        actual_start: data.actual_start,
        actual_end: data.actual_end,
        total_cases: data.total_cases || 0,
        passed_count: data.passed_count || 0,
        failed_count: data.failed_count || 0,
        blocked_count: data.blocked_count || 0,
        skipped_count: data.skipped_count || 0,
        not_run_count: data.not_run_count || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by: data.created_by,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycles'] });
      toast.success('Test cycle created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create cycle: ${error.message}`);
    },
  });
}

// ============================================================================
// Delete Cycle Mutation
// ============================================================================

export function useDeleteCycleEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cycleId: string): Promise<void> => {
      const { error } = await supabase
        .from('tm_test_cycles')
        .delete()
        .eq('id', cycleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycles'] });
      toast.success('Test cycle deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete cycle: ${error.message}`);
    },
  });
}

// ============================================================================
// Clone Cycle Mutation
// ============================================================================

export function useCloneCycleEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { cycleId: string; projectId: string }): Promise<CycleWithDetails> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch original
      const { data: original, error: fetchError } = await supabase
        .from('tm_test_cycles')
        .select('*')
        .eq('id', input.cycleId)
        .single();

      if (fetchError) throw fetchError;

      // Generate new key
      const cycleKey = await generateCycleKey(input.projectId);

      // Create clone
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .insert({
          project_id: original.project_id,
          cycle_key: cycleKey,
          name: `${original.name} (Copy)`,
          description: original.description,
          status: 'planned',
          environment: original.environment,
          release_id: original.release_id,
          assigned_to: original.assigned_to,
          created_by: user.id,
        })
        .select(`
          id,
          cycle_key,
          name,
          description,
          status,
          environment,
          release_id,
          release:releases(id, name),
          assigned_to,
          assignee:profiles!tm_test_cycles_assigned_to_fkey(id, full_name, avatar_url),
          planned_start,
          planned_end,
          actual_start,
          actual_end,
          total_cases,
          passed_count,
          failed_count,
          blocked_count,
          skipped_count,
          not_run_count,
          created_at,
          updated_at,
          created_by
        `)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        key: data.cycle_key,
        name: data.name,
        description: data.description,
        status: data.status || 'planned',
        environment: data.environment || 'staging',
        release_id: data.release_id,
        release: data.release as any,
        assigned_to: data.assigned_to,
        assignee: data.assignee as any,
        planned_start: data.planned_start,
        planned_end: data.planned_end,
        actual_start: data.actual_start,
        actual_end: data.actual_end,
        total_cases: data.total_cases || 0,
        passed_count: data.passed_count || 0,
        failed_count: data.failed_count || 0,
        blocked_count: data.blocked_count || 0,
        skipped_count: data.skipped_count || 0,
        not_run_count: data.not_run_count || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by: data.created_by,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycles'] });
      toast.success('Test cycle duplicated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate cycle: ${error.message}`);
    },
  });
}
