// ============================================================================
// HOOK: useTestCycles
// File: /hooks/test-management/useTestCycles.ts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TMCycle, 
  TMCycleScope, 
  CycleFilters, 
  CreateCycleInput, 
  UpdateCycleInput,
  ScopeFilters 
} from '@/types/test-management';
import { toast } from 'sonner';

// Status mapping (DB uses lowercase)
const cycleStatusToDb = (status: string): 'planned' | 'in_progress' | 'completed' | 'archived' => {
  const map: Record<string, 'planned' | 'in_progress' | 'completed' | 'archived'> = {
    'PLANNED': 'planned',
    'IN_PROGRESS': 'in_progress',
    'COMPLETED': 'completed',
    'CANCELLED': 'archived',
    'ARCHIVED': 'archived',
  };
  return map[status] || 'planned';
};

const cycleStatusFromDb = (status: string | null): 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' => {
  const map: Record<string, 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'> = {
    'planned': 'PLANNED',
    'in_progress': 'IN_PROGRESS',
    'completed': 'COMPLETED',
    'archived': 'CANCELLED',
  };
  return map[status || 'planned'] || 'PLANNED';
};

// Execution status mapping
const execStatusToDb = (status: string): 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped' => {
  const map: Record<string, 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped'> = {
    'NOT_RUN': 'not_run',
    'IN_PROGRESS': 'in_progress',
    'PASSED': 'passed',
    'FAILED': 'failed',
    'BLOCKED': 'blocked',
    'SKIPPED': 'skipped',
  };
  return map[status] || 'not_run';
};

const execStatusFromDb = (status: string | null): 'NOT_RUN' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' => {
  const map: Record<string, 'NOT_RUN' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'> = {
    'not_run': 'NOT_RUN',
    'in_progress': 'IN_PROGRESS',
    'passed': 'PASSED',
    'failed': 'FAILED',
    'blocked': 'BLOCKED',
    'skipped': 'SKIPPED',
  };
  return map[status || 'not_run'] || 'NOT_RUN';
};

// ============================================================================
// GENERATE CYCLE KEY
// ============================================================================

async function generateCycleKey(projectId: string): Promise<string> {
  // Try database function first
  try {
    const { data, error } = await supabase.rpc('tm_next_entity_key', {
      p_prefix: 'CY',
      p_project_id: projectId,
    });
    if (!error && data) return data;
  } catch {
    // Fallback below
  }

  // Fallback: generate manually
  const { count } = await supabase
    .from('tm_test_cycles')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const nextNum = (count || 0) + 1;
  return `CY-${String(nextNum).padStart(3, '0')}`;
}

// Helper to map DB row to TMCycle
function mapDbRowToTMCycle(row: any): TMCycle {
  return {
    id: row.id,
    project_id: row.project_id,
    key: row.cycle_key,
    name: row.name,
    description: row.description || undefined,
    status: cycleStatusFromDb(row.status),
    environment: row.environment_id || undefined,
    build_version: undefined, // Not in schema
    planned_start_date: row.planned_start || undefined,
    planned_end_date: row.planned_end || undefined,
    actual_start_date: row.actual_start || undefined,
    actual_end_date: row.actual_end || undefined,
    created_by: row.created_by || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    total_cases: row.total_cases || 0,
    passed_count: row.passed_count || 0,
    failed_count: row.failed_count || 0,
    blocked_count: row.blocked_count || 0,
    not_run_count: row.not_run_count || 0,
    pass_rate: row.total_cases > 0 
      ? Math.round((row.passed_count / row.total_cases) * 100) 
      : 0,
  };
}

// ============================================================================
// FETCH CYCLES
// ============================================================================

export function useTestCycles(projectId: string | undefined, filters?: CycleFilters) {
  return useQuery({
    queryKey: ['tm-cycles', projectId, filters],
    queryFn: async (): Promise<TMCycle[]> => {
      if (!projectId) return [];

      let query = supabase
        .from('tm_test_cycles')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          const dbStatuses = filters.status.map(s => cycleStatusToDb(s));
          query = query.in('status', dbStatuses);
        } else {
          query = query.eq('status', cycleStatusToDb(filters.status));
        }
      }

      if (filters?.environment) {
        query = query.eq('environment_id', filters.environment);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,cycle_key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching cycles:', error);
        throw error;
      }

      return (data || []).map(mapDbRowToTMCycle);
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// FETCH SINGLE CYCLE
// ============================================================================

export function useTestCycle(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['tm-cycle', cycleId],
    queryFn: async (): Promise<TMCycle | null> => {
      if (!cycleId) return null;

      const { data, error } = await supabase
        .from('tm_test_cycles')
        .select('*')
        .eq('id', cycleId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching cycle:', error);
        throw error;
      }

      if (!data) return null;

      return mapDbRowToTMCycle(data);
    },
    enabled: !!cycleId,
  });
}

// ============================================================================
// CREATE CYCLE
// ============================================================================

export function useCreateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCycleInput & { project_id: string }): Promise<TMCycle> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const cycleKey = await generateCycleKey(input.project_id);

      const { data, error } = await supabase
        .from('tm_test_cycles')
        .insert({
          project_id: input.project_id,
          cycle_key: cycleKey,
          name: input.name,
          description: input.description,
          status: 'planned',
          environment_id: input.environment || null,
          planned_start: input.planned_start_date || null,
          planned_end: input.planned_end_date || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbRowToTMCycle(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles', data.project_id] });
      toast.success('Test cycle created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create cycle: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE CYCLE
// ============================================================================

export function useUpdateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCycleInput & { project_id: string }): Promise<TMCycle> => {
      const { id, project_id, status, ...rest } = input;

      const updates: Record<string, any> = {};
      
      if (rest.name !== undefined) updates.name = rest.name;
      if (rest.description !== undefined) updates.description = rest.description;
      if (rest.environment !== undefined) updates.environment_id = rest.environment;
      if (rest.planned_start_date !== undefined) updates.planned_start = rest.planned_start_date;
      if (rest.planned_end_date !== undefined) updates.planned_end = rest.planned_end_date;
      
      if (status !== undefined) {
        updates.status = cycleStatusToDb(status);
        
        // If changing to in_progress, set actual_start
        if (status === 'IN_PROGRESS') {
          updates.actual_start = new Date().toISOString();
        }
        
        // If changing to completed or cancelled, set actual_end
        if (status === 'COMPLETED' || status === 'CANCELLED') {
          updates.actual_end = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('tm_test_cycles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapDbRowToTMCycle(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', data.id] });
      toast.success('Cycle updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update cycle: ${error.message}`);
    },
  });
}

// ============================================================================
// DELETE CYCLE
// ============================================================================

export function useDeleteCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<void> => {
      const { error } = await supabase
        .from('tm_test_cycles')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles', variables.project_id] });
      toast.success('Cycle deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete cycle: ${error.message}`);
    },
  });
}

// ============================================================================
// CLONE CYCLE
// ============================================================================

export function useCloneCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<TMCycle> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch original
      const { data: original, error: fetchError } = await supabase
        .from('tm_test_cycles')
        .select('*')
        .eq('id', input.id)
        .single();

      if (fetchError) throw fetchError;

      // Fetch scope
      const { data: scope } = await supabase
        .from('tm_cycle_scope')
        .select('test_case_id')
        .eq('cycle_id', input.id);

      // Generate new key
      const cycleKey = await generateCycleKey(input.project_id);

      // Create cloned cycle
      const { data: cloned, error: cloneError } = await supabase
        .from('tm_test_cycles')
        .insert({
          project_id: original.project_id,
          cycle_key: cycleKey,
          name: `${original.name} (Copy)`,
          description: original.description,
          status: 'planned',
          environment_id: original.environment_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (cloneError) throw cloneError;

      // Clone scope
      if (scope && scope.length > 0) {
        const scopeToInsert = scope.map(s => ({
          cycle_id: cloned.id,
          test_case_id: s.test_case_id,
          current_status: 'not_run' as const,
        }));

        await supabase.from('tm_cycle_scope').insert(scopeToInsert);
      }

      return mapDbRowToTMCycle(cloned);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles', data.project_id] });
      toast.success('Cycle cloned');
    },
    onError: (error: Error) => {
      toast.error(`Failed to clone cycle: ${error.message}`);
    },
  });
}

// ============================================================================
// FETCH CYCLE SCOPE
// ============================================================================

export function useCycleScope(cycleId: string | undefined, filters?: ScopeFilters) {
  return useQuery({
    queryKey: ['tm-cycle-scope', cycleId, filters],
    queryFn: async (): Promise<TMCycleScope[]> => {
      if (!cycleId) return [];

      let query = supabase
        .from('tm_cycle_scope')
        .select(`
          *,
          test_case:tm_test_cases(
            id, case_key, title, status,
            priority:tm_case_priorities(*),
            type:tm_case_types(*)
          ),
          assignee:profiles(id, full_name, avatar_url)
        `)
        .eq('cycle_id', cycleId)
        .order('sort_order', { ascending: true });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          const dbStatuses = filters.status.map(s => execStatusToDb(s));
          query = query.in('current_status', dbStatuses);
        } else {
          query = query.eq('current_status', execStatusToDb(filters.status));
        }
      }

      if (filters?.assigned_to) {
        if (filters.assigned_to === 'unassigned') {
          query = query.is('assigned_to', null);
        } else {
          query = query.eq('assigned_to', filters.assigned_to);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching cycle scope:', error);
        throw error;
      }

      // Map to TMCycleScope
      return (data || []).map((row: any) => ({
        id: row.id,
        cycle_id: row.cycle_id,
        case_id: row.test_case_id,
        assigned_to: row.assigned_to,
        status: execStatusFromDb(row.current_status),
        last_run_id: null,
        last_run_at: null,
        created_at: row.added_at || '',
        test_case: row.test_case ? {
          ...row.test_case,
          key: row.test_case.case_key,
        } : undefined,
        assignee: row.assignee,
      }));
    },
    enabled: !!cycleId,
  });
}

// ============================================================================
// ADD CASES TO SCOPE
// ============================================================================

export function useAddCasesToScope() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      cycle_id: string; 
      case_ids: string[];
    }): Promise<void> => {
      const scopeToInsert = input.case_ids.map((caseId, index) => ({
        cycle_id: input.cycle_id,
        test_case_id: caseId,
        current_status: 'not_run' as const,
        sort_order: index,
      }));

      const { error } = await supabase
        .from('tm_cycle_scope')
        .upsert(scopeToInsert, { 
          onConflict: 'cycle_id,test_case_id',
          ignoreDuplicates: true 
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', variables.cycle_id] });
      toast.success(`Added ${variables.case_ids.length} case(s) to cycle`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add cases: ${error.message}`);
    },
  });
}

// ============================================================================
// REMOVE FROM SCOPE
// ============================================================================

export function useRemoveFromScope() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      cycle_id: string; 
      scope_ids: string[];
    }): Promise<void> => {
      const { error } = await supabase
        .from('tm_cycle_scope')
        .delete()
        .in('id', input.scope_ids);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', variables.cycle_id] });
      toast.success('Removed from cycle');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });
}

// ============================================================================
// ASSIGN TESTER TO SCOPE
// ============================================================================

export function useAssignTester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      cycle_id: string;
      scope_ids: string[];
      assigned_to: string | null;
    }): Promise<void> => {
      const { error } = await supabase
        .from('tm_cycle_scope')
        .update({ assigned_to: input.assigned_to })
        .in('id', input.scope_ids);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      toast.success('Tester assigned');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign: ${error.message}`);
    },
  });
}

// ============================================================================
// BULK ASSIGN (Round Robin)
// ============================================================================

export function useBulkAssignTesters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      cycle_id: string;
      scope_ids: string[];
      tester_ids: string[];
    }): Promise<void> => {
      // Distribute cases round-robin
      for (let i = 0; i < input.scope_ids.length; i++) {
        const scopeId = input.scope_ids[i];
        const testerId = input.tester_ids[i % input.tester_ids.length];
        
        await supabase
          .from('tm_cycle_scope')
          .update({ assigned_to: testerId })
          .eq('id', scopeId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', variables.cycle_id] });
      toast.success('Testers assigned');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign: ${error.message}`);
    },
  });
}

// ============================================================================
// COMPLETE CYCLE
// ============================================================================

export function useCompleteCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<TMCycle> => {
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .update({ 
          status: 'completed',
          actual_end: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return mapDbRowToTMCycle(data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', data.id] });
      toast.success('Cycle completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete cycle: ${error.message}`);
    },
  });
}

// ============================================================================
// START CYCLE
// ============================================================================

export function useStartCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<TMCycle> => {
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .update({ 
          status: 'in_progress',
          actual_start: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return mapDbRowToTMCycle(data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', data.id] });
      toast.success('Cycle started');
    },
    onError: (error: Error) => {
      toast.error(`Failed to start cycle: ${error.message}`);
    },
  });
}
