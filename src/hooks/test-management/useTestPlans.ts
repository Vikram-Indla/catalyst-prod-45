/**
 * Test Plans Hooks
 * CRUD operations for tm_test_plans and tm_test_plan_cases tables
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TMTestPlan, 
  TMTestPlanCase, 
  TestPlanFilters, 
  CreateTestPlanInput, 
  UpdateTestPlanInput,
  TestPlanHealth,
  TestPlanStatus 
} from '@/types/test-management';
import { catalystToast } from '@/lib/catalystToast';

// Status mapping helpers
type DbTestPlanStatus = 'draft' | 'active' | 'completed' | 'archived';

const statusFromDb = (status: string | null): TestPlanStatus => {
  return (status as TestPlanStatus) || 'draft';
};

const statusToDb = (status: TestPlanStatus): DbTestPlanStatus => {
  return status as DbTestPlanStatus;
};

// ============================================================
// FETCH HOOKS
// ============================================================

/**
 * Fetch all test plans for a project with optional filters
 */
export function useTestPlans(projectId: string | undefined, filters?: TestPlanFilters) {
  return useQuery({
    queryKey: ['tm-test-plans', projectId, filters],
    queryFn: async (): Promise<{ plans: TMTestPlan[]; total: number }> => {
      if (!projectId) return { plans: [], total: 0 };

      let query = supabase
        .from('tm_test_plans')
        .select(`
          *,
          owner:profiles!tm_test_plans_owner_id_fkey(id, full_name, avatar_url),
          release:releases!tm_test_plans_release_id_fkey(id, name, version),
          created_by_user:profiles!tm_test_plans_created_by_fkey(id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('project_id', projectId);

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters?.release_id) {
        query = query.eq('release_id', filters.release_id);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,plan_key.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.date_from) {
        query = query.gte('start_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('end_date', filters.date_to);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const plans: TMTestPlan[] = (data || []).map((row: any) => ({
        id: row.id,
        project_id: row.project_id,
        plan_key: row.plan_key,
        name: row.name,
        description: row.description,
        status: statusFromDb(row.status),
        start_date: row.start_date,
        end_date: row.end_date,
        release_id: row.release_id,
        objectives: row.objectives,
        in_scope: row.in_scope,
        out_of_scope: row.out_of_scope,
        test_strategy: row.test_strategy,
        environment_requirements: row.environment_requirements,
        owner_id: row.owner_id,
        team_members: row.team_members || [],
        total_tests: row.total_tests || 0,
        passed_count: row.passed_count || 0,
        failed_count: row.failed_count || 0,
        blocked_count: row.blocked_count || 0,
        skipped_count: row.skipped_count || 0,
        not_run_count: row.not_run_count || 0,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        owner: row.owner,
        release: row.release,
        created_by_user: row.created_by_user,
      }));

      return { plans, total: count || 0 };
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single test plan by ID
 */
export function useTestPlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['tm-test-plan', planId],
    queryFn: async (): Promise<TMTestPlan | null> => {
      if (!planId) return null;

      const { data, error } = await supabase
        .from('tm_test_plans')
        .select(`
          *,
          owner:profiles!tm_test_plans_owner_id_fkey(id, full_name, avatar_url),
          release:releases!tm_test_plans_release_id_fkey(id, name, version),
          created_by_user:profiles!tm_test_plans_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('id', planId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        project_id: data.project_id,
        plan_key: data.plan_key,
        name: data.name,
        description: data.description,
        status: statusFromDb(data.status),
        start_date: data.start_date,
        end_date: data.end_date,
        release_id: data.release_id,
        objectives: data.objectives,
        in_scope: data.in_scope,
        out_of_scope: data.out_of_scope,
        test_strategy: data.test_strategy,
        environment_requirements: data.environment_requirements,
        owner_id: data.owner_id,
        team_members: data.team_members || [],
        total_tests: data.total_tests || 0,
        passed_count: data.passed_count || 0,
        failed_count: data.failed_count || 0,
        blocked_count: data.blocked_count || 0,
        skipped_count: data.skipped_count || 0,
        not_run_count: data.not_run_count || 0,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        owner: data.owner,
        release: data.release,
        created_by_user: data.created_by_user,
      };
    },
    enabled: !!planId,
  });
}

/**
 * Fetch test cases linked to a plan
 */
export function useTestPlanCases(planId: string | undefined) {
  return useQuery({
    queryKey: ['tm-test-plan-cases', planId],
    queryFn: async (): Promise<TMTestPlanCase[]> => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from('tm_test_plan_cases')
        .select(`
          *,
          test_case:tm_test_cases(
            id, key, title, status, priority_id, type_id,
            priority:tm_case_priorities(id, name, color),
            type:tm_case_types(id, name, icon)
          ),
          added_by_user:profiles!tm_test_plan_cases_added_by_fkey(id, full_name, avatar_url)
        `)
        .eq('test_plan_id', planId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        test_plan_id: row.test_plan_id,
        test_case_id: row.test_case_id,
        sort_order: row.sort_order,
        added_by: row.added_by,
        added_at: row.added_at,
        test_case: row.test_case,
        added_by_user: row.added_by_user,
      }));
    },
    enabled: !!planId,
  });
}

/**
 * Calculate test plan health metrics
 */
export function useTestPlanHealth(plan: TMTestPlan | null | undefined) {
  return useQuery({
    queryKey: ['tm-test-plan-health', plan?.id],
    queryFn: async (): Promise<TestPlanHealth> => {
      if (!plan) {
        return {
          passRate: 0,
          executionProgress: 0,
          daysRemaining: null,
          isOverdue: false,
          riskLevel: 'low',
        };
      }

      const total = plan.total_tests || 0;
      const executed = total - (plan.not_run_count || 0);
      const passRate = executed > 0 ? ((plan.passed_count || 0) / executed) * 100 : 0;
      const executionProgress = total > 0 ? (executed / total) * 100 : 0;

      let daysRemaining: number | null = null;
      let isOverdue = false;

      if (plan.end_date) {
        const endDate = new Date(plan.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        isOverdue = daysRemaining < 0 && plan.status !== 'completed';
      }

      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const failureRate = executed > 0 ? ((plan.failed_count || 0) + (plan.blocked_count || 0)) / executed * 100 : 0;

      if (isOverdue || failureRate > 30) {
        riskLevel = 'critical';
      } else if ((daysRemaining !== null && daysRemaining <= 3 && executionProgress < 80) || failureRate > 20) {
        riskLevel = 'high';
      } else if ((daysRemaining !== null && daysRemaining <= 7 && executionProgress < 50) || failureRate > 10) {
        riskLevel = 'medium';
      }

      return {
        passRate,
        executionProgress,
        daysRemaining,
        isOverdue,
        riskLevel,
      };
    },
    enabled: !!plan,
  });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

/**
 * Create a new test plan
 */
export function useCreateTestPlan(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTestPlanInput): Promise<TMTestPlan> => {
      if (!projectId) throw new Error('Project ID is required');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate plan key
      const { data: countData } = await supabase
        .from('tm_test_plans')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      const count = countData ? 1 : 1;
      const planKey = `TP-${String(count).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('tm_test_plans')
        .insert({
          project_id: projectId,
          plan_key: planKey,
          name: input.name,
          description: input.description,
          status: statusToDb(input.status || 'draft'),
          start_date: input.start_date,
          end_date: input.end_date,
          release_id: input.release_id,
          objectives: input.objectives,
          in_scope: input.in_scope,
          out_of_scope: input.out_of_scope,
          test_strategy: input.test_strategy,
          environment_requirements: input.environment_requirements,
          owner_id: input.owner_id || user.id,
          team_members: input.team_members || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        status: statusFromDb(data.status),
        total_tests: 0,
        passed_count: 0,
        failed_count: 0,
        blocked_count: 0,
        skipped_count: 0,
        not_run_count: 0,
      } as TMTestPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-plans', projectId] });
      catalystToast.success('Test plan created successfully');
    },
    onError: (error) => {
      catalystToast.error(`Failed to create test plan: ${error.message}`);
    },
  });
}

/**
 * Update an existing test plan
 */
export function useUpdateTestPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTestPlanInput): Promise<TMTestPlan> => {
      const { id, ...updates } = input;

      const updateData: Record<string, any> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) updateData.status = statusToDb(updates.status);
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
      if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
      if (updates.release_id !== undefined) updateData.release_id = updates.release_id;
      if (updates.objectives !== undefined) updateData.objectives = updates.objectives;
      if (updates.in_scope !== undefined) updateData.in_scope = updates.in_scope;
      if (updates.out_of_scope !== undefined) updateData.out_of_scope = updates.out_of_scope;
      if (updates.test_strategy !== undefined) updateData.test_strategy = updates.test_strategy;
      if (updates.environment_requirements !== undefined) updateData.environment_requirements = updates.environment_requirements;
      if (updates.owner_id !== undefined) updateData.owner_id = updates.owner_id;
      if (updates.team_members !== undefined) updateData.team_members = updates.team_members;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('tm_test_plans')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        status: statusFromDb(data.status),
      } as TMTestPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-plans'] });
      queryClient.invalidateQueries({ queryKey: ['tm-test-plan', data.id] });
      catalystToast.success('Test plan updated successfully');
    },
    onError: (error) => {
      catalystToast.error(`Failed to update test plan: ${error.message}`);
    },
  });
}

/**
 * Delete a test plan
 */
export function useDeleteTestPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<void> => {
      const { error } = await supabase
        .from('tm_test_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-plans'] });
      catalystToast.success('Test plan deleted successfully');
    },
    onError: (error) => {
      catalystToast.error(`Failed to delete test plan: ${error.message}`);
    },
  });
}

/**
 * Add test cases to a plan
 */
export function useAddCasesToPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, caseIds }: { planId: string; caseIds: string[] }): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current max sort order
      const { data: existing } = await supabase
        .from('tm_test_plan_cases')
        .select('sort_order')
        .eq('test_plan_id', planId)
        .order('sort_order', { ascending: false })
        .limit(1);

      let nextOrder = (existing?.[0]?.sort_order || 0) + 1;

      const inserts = caseIds.map((caseId) => ({
        test_plan_id: planId,
        test_case_id: caseId,
        sort_order: nextOrder++,
        added_by: user.id,
      }));

      const { error } = await supabase
        .from('tm_test_plan_cases')
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-plan-cases', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['tm-test-plan', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['tm-test-plans'] });
      catalystToast.success('Test cases added to plan');
    },
    onError: (error) => {
      catalystToast.error(`Failed to add cases: ${error.message}`);
    },
  });
}

/**
 * Remove test cases from a plan
 */
export function useRemoveCasesFromPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, caseIds }: { planId: string; caseIds: string[] }): Promise<void> => {
      const { error } = await supabase
        .from('tm_test_plan_cases')
        .delete()
        .eq('test_plan_id', planId)
        .in('test_case_id', caseIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-plan-cases', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['tm-test-plan', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['tm-test-plans'] });
      catalystToast.success('Test cases removed from plan');
    },
    onError: (error) => {
      catalystToast.error(`Failed to remove cases: ${error.message}`);
    },
  });
}

/**
 * Clone an existing test plan
 */
export function useCloneTestPlan(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<TMTestPlan> => {
      if (!projectId) throw new Error('Project ID is required');

      // Fetch original plan
      const { data: original, error: fetchError } = await supabase
        .from('tm_test_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (fetchError) throw fetchError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate new plan key
      const { count } = await supabase
        .from('tm_test_plans')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      const planKey = `TP-${String((count || 0) + 1).padStart(4, '0')}`;

      // Create cloned plan
      const { data: cloned, error: cloneError } = await supabase
        .from('tm_test_plans')
        .insert({
          project_id: projectId,
          plan_key: planKey,
          name: `${original.name} (Copy)`,
          description: original.description,
          status: 'draft',
          objectives: original.objectives,
          in_scope: original.in_scope,
          out_of_scope: original.out_of_scope,
          test_strategy: original.test_strategy,
          environment_requirements: original.environment_requirements,
          owner_id: user.id,
          team_members: original.team_members || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (cloneError) throw cloneError;

      // Clone linked test cases
      const { data: originalCases } = await supabase
        .from('tm_test_plan_cases')
        .select('test_case_id, sort_order')
        .eq('test_plan_id', planId);

      if (originalCases && originalCases.length > 0) {
        const caseInserts = originalCases.map((tc) => ({
          test_plan_id: cloned.id,
          test_case_id: tc.test_case_id,
          sort_order: tc.sort_order,
          added_by: user.id,
        }));

        await supabase.from('tm_test_plan_cases').insert(caseInserts);
      }

      return {
        ...cloned,
        status: statusFromDb(cloned.status),
        total_tests: originalCases?.length || 0,
        passed_count: 0,
        failed_count: 0,
        blocked_count: 0,
        skipped_count: 0,
        not_run_count: originalCases?.length || 0,
      } as TMTestPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-test-plans', projectId] });
      catalystToast.success('Test plan cloned successfully');
    },
    onError: (error) => {
      catalystToast.error(`Failed to clone test plan: ${error.message}`);
    },
  });
}
