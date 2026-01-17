// ══════════════════════════════════════════════════════════════════════════════
// TEST PLANS - REACT QUERY HOOKS (tm_test_plans)
// ══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  TestPlan,
  TestPlanWithStats,
  PlanTestCase,
  CreateTestPlanInput,
  UpdateTestPlanInput,
  AddTestCasesToPlanInput,
  TestPlanFilters,
  TestPlanStatus,
} from '../types/testPlans';

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const testPlanKeys = {
  all: ['tm-test-plans'] as const,
  lists: () => [...testPlanKeys.all, 'list'] as const,
  list: (filters?: TestPlanFilters) => [...testPlanKeys.lists(), filters] as const,
  detail: (id: string) => [...testPlanKeys.all, 'detail', id] as const,
  testCases: (planId: string) => [...testPlanKeys.all, 'test-cases', planId] as const,
  stats: (planId: string) => [...testPlanKeys.all, 'stats', planId] as const,
  burndown: (planId: string, days?: number) => [...testPlanKeys.all, 'burndown', planId, days] as const,
  defects: (planId: string) => [...testPlanKeys.all, 'defects', planId] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper to map DB row to TestPlan type
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToTestPlan(row: any): TestPlan {
  return {
    id: row.id,
    key: row.key || '',
    name: row.name,
    description: row.description,
    status: row.status as TestPlanStatus,
    release_id: row.release_id,
    start_date: row.start_date,
    end_date: row.end_date,
    objectives: row.objectives,
    in_scope: row.in_scope,
    out_of_scope: row.out_of_scope,
    test_strategy: row.test_strategy,
    environment_requirements: row.environment_requirements,
    owner_id: row.owner_id,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_tests: row.total_tests || 0,
    passed_count: row.passed_count || 0,
    failed_count: row.failed_count || 0,
    blocked_count: row.blocked_count || 0,
    skipped_count: row.skipped_count || 0,
    todo_count: row.todo_count || 0,
    release: row.release,
    owner: row.owner,
    creator: row.creator,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToTestPlanWithStats(row: any): TestPlanWithStats {
  const plan = mapToTestPlan(row);
  const executed = plan.passed_count + plan.failed_count + plan.blocked_count + plan.skipped_count;
  return {
    ...plan,
    test_case_count: plan.total_tests,
    team_member_count: 0,
    progress_percentage: plan.total_tests > 0
      ? Math.round((executed / plan.total_tests) * 100)
      : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Plans Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useTestPlans(filters?: TestPlanFilters) {
  return useQuery({
    queryKey: testPlanKeys.list(filters),
    queryFn: async (): Promise<TestPlanWithStats[]> => {
      let query = supabase
        .from('tm_test_plans')
        .select(`
          *,
          release:releases(id, name, version),
          owner:profiles!tm_test_plans_owner_id_fkey(id, full_name, avatar_url),
          creator:profiles!tm_test_plans_created_by_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.release_id) {
        query = query.eq('release_id', filters.release_id);
      }

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(mapToTestPlanWithStats);
    },
  });
}

export function useTestPlan(planId: string | undefined) {
  return useQuery({
    queryKey: testPlanKeys.detail(planId || ''),
    queryFn: async (): Promise<TestPlan | null> => {
      if (!planId) return null;

      const { data, error } = await supabase
        .from('tm_test_plans')
        .select(`
          *,
          release:releases(id, name, version),
          owner:profiles!tm_test_plans_owner_id_fkey(id, full_name, avatar_url),
          creator:profiles!tm_test_plans_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;

      return mapToTestPlan(data);
    },
    enabled: !!planId,
  });
}

// Get plan by key (TP-XXXX)
export function useTestPlanByKey(key: string | undefined) {
  return useQuery({
    queryKey: [...testPlanKeys.all, 'by-key', key],
    queryFn: async (): Promise<TestPlan | null> => {
      if (!key) return null;

      const { data, error } = await supabase
        .from('tm_test_plans')
        .select(`
          *,
          release:releases(id, name, version),
          owner:profiles!tm_test_plans_owner_id_fkey(id, full_name, avatar_url),
          creator:profiles!tm_test_plans_created_by_fkey(id, full_name, avatar_url)
        `)
        .ilike('key', key)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return mapToTestPlan(data);
    },
    enabled: !!key,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Statistics
// ─────────────────────────────────────────────────────────────────────────────

export interface TestPlanStats {
  total_tests: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  todo: number;
  pass_rate: number;
  execution_rate: number;
  open_defects: number;
}

export function useTestPlanStats(planId: string | undefined) {
  return useQuery({
    queryKey: testPlanKeys.stats(planId || ''),
    queryFn: async (): Promise<TestPlanStats> => {
      // Get plan with stats
      const { data: plan, error: planError } = await supabase
        .from('tm_test_plans')
        .select('total_tests, passed_count, failed_count, blocked_count, skipped_count')
        .eq('id', planId!)
        .single();

      if (planError) throw planError;

      // Get open defects count
      const { count: openDefects } = await supabase
        .from('tm_defects')
        .select('*', { count: 'exact', head: true })
        .eq('source_test_plan_id', planId!)
        .in('status', ['open', 'in_progress']);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = plan as any;
      const total = p.total_tests || 0;
      const passed = p.passed_count || 0;
      const failed = p.failed_count || 0;
      const blocked = p.blocked_count || 0;
      const skipped = p.skipped_count || 0;
      const executed = passed + failed + blocked + skipped;
      const todo = Math.max(0, total - executed);

      return {
        total_tests: total,
        passed,
        failed,
        blocked,
        skipped,
        todo,
        pass_rate: executed > 0 ? Math.round((passed / executed) * 100) : 0,
        execution_rate: total > 0 ? Math.round((executed / total) * 100) : 0,
        open_defects: openDefects || 0,
      };
    },
    enabled: !!planId,
    refetchInterval: 30000, // Refresh every 30s
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Burndown Data
// ─────────────────────────────────────────────────────────────────────────────

export interface BurndownDataPoint {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  remaining: number;
}

export function useTestPlanBurndown(planId: string | undefined, days: number = 7) {
  return useQuery({
    queryKey: testPlanKeys.burndown(planId || '', days),
    queryFn: async (): Promise<BurndownDataPoint[]> => {
      const { data, error } = await supabase
        .rpc('tm_get_plan_burndown', {
          p_test_plan_id: planId!,
          p_days: days,
        });

      if (error) {
        console.warn('Burndown RPC not available:', error);
        return [];
      }
      return (data || []) as BurndownDataPoint[];
    },
    enabled: !!planId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Test Cases Queries
// ─────────────────────────────────────────────────────────────────────────────

export function usePlanTestCases(planId: string | undefined) {
  return useQuery({
    queryKey: testPlanKeys.testCases(planId || ''),
    queryFn: async (): Promise<PlanTestCase[]> => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from('tm_test_plan_cases')
        .select(`
          *,
          test_case:tm_test_cases(id, case_key, title, status, priority_id, folder_id)
        `)
        .eq('test_plan_id', planId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((item: any) => ({
        id: item.id,
        plan_id: item.test_plan_id,
        test_case_id: item.test_case_id,
        execution_order: item.sort_order,
        assigned_to: null,
        added_at: item.added_at,
        test_case: item.test_case ? {
          id: item.test_case.id,
          case_key: item.test_case.case_key,
          title: item.test_case.title,
          status: item.test_case.status,
          priority_id: item.test_case.priority_id,
          folder_id: item.test_case.folder_id,
        } : null,
        assignee: null,
      }));
    },
    enabled: !!planId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Defects
// ─────────────────────────────────────────────────────────────────────────────

export function usePlanDefects(planId: string | undefined) {
  return useQuery({
    queryKey: testPlanKeys.defects(planId || ''),
    queryFn: async () => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from('tm_defects')
        .select(`
          *,
          reporter:profiles!tm_defects_reported_by_fkey(id, full_name, avatar_url),
          assignee:profiles!tm_defects_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('source_test_plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!planId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Plan Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateTestPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTestPlanInput): Promise<TestPlan> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertData: any = {
        name: input.name,
        description: input.description || null,
        status: input.status || 'draft',
        release_id: input.release_id || null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        objectives: input.objectives || null,
        in_scope: input.scope_in || null,
        out_of_scope: input.scope_out || null,
        test_strategy: input.test_strategy || null,
        environment_requirements: input.environment_requirements || null,
        owner_id: user?.id || null,
        created_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from('tm_test_plans')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return mapToTestPlan(data);
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success(`Test plan "${plan.name}" created (${plan.key})`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create test plan: ${error.message}`);
    },
  });
}

export function useUpdateTestPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTestPlanInput }): Promise<TestPlan> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.release_id !== undefined) updateData.release_id = input.release_id;
      if (input.start_date !== undefined) updateData.start_date = input.start_date;
      if (input.end_date !== undefined) updateData.end_date = input.end_date;
      if (input.objectives !== undefined) updateData.objectives = input.objectives;
      if (input.scope_in !== undefined) updateData.in_scope = input.scope_in;
      if (input.scope_out !== undefined) updateData.out_of_scope = input.scope_out;
      if (input.test_strategy !== undefined) updateData.test_strategy = input.test_strategy;
      if (input.environment_requirements !== undefined) updateData.environment_requirements = input.environment_requirements;

      const { data, error } = await supabase
        .from('tm_test_plans')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return mapToTestPlan(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.detail(data.id) });
      toast.success('Test plan updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update test plan: ${error.message}`);
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success('Test plan deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete test plan: ${error.message}`);
    },
  });
}

export function useArchiveTestPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<TestPlan> => {
      const { data, error } = await supabase
        .from('tm_test_plans')
        .update({ status: 'archived' })
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;
      return mapToTestPlan(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.detail(data.id) });
      toast.success('Test plan archived');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Transitions
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['executing', 'completed', 'archived'],
  executing: ['active', 'completed', 'archived'],
  completed: ['active', 'archived'],
  archived: ['draft'],
};

export function useTransitionPlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, newStatus }: { planId: string; newStatus: TestPlanStatus }): Promise<TestPlan> => {
      // Get current status
      const { data: current, error: fetchError } = await supabase
        .from('tm_test_plans')
        .select('status')
        .eq('id', planId)
        .single();

      if (fetchError) throw fetchError;

      // Validate transition
      const validTargets = VALID_TRANSITIONS[current.status] || [];
      if (!validTargets.includes(newStatus)) {
        throw new Error(`Invalid status transition from '${current.status}' to '${newStatus}'`);
      }

      const { data, error } = await supabase
        .from('tm_test_plans')
        .update({ status: newStatus })
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;
      return mapToTestPlan(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.detail(data.id) });
      toast.success(`Status changed to ${data.status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Test Cases Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useAddTestCasesToPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddTestCasesToPlanInput): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get max sort order
      const { data: existingCases } = await supabase
        .from('tm_test_plan_cases')
        .select('sort_order')
        .eq('test_plan_id', input.plan_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      let sortOrder = ((existingCases?.[0]?.sort_order) || 0) + 1;

      const records = input.test_case_ids.map((testCaseId) => ({
        test_plan_id: input.plan_id,
        test_case_id: testCaseId,
        sort_order: sortOrder++,
        added_by: user?.id || null,
      }));

      const { error } = await supabase
        .from('tm_test_plan_cases')
        .upsert(records, { onConflict: 'test_plan_id,test_case_id' });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.testCases(variables.plan_id) });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.stats(variables.plan_id) });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success('Test cases added to plan');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add test cases: ${error.message}`);
    },
  });
}

export function useRemoveTestCaseFromPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, testCaseId }: { planId: string; testCaseId: string }): Promise<void> => {
      const { error } = await supabase
        .from('tm_test_plan_cases')
        .delete()
        .eq('test_plan_id', planId)
        .eq('test_case_id', testCaseId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.testCases(variables.planId) });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.stats(variables.planId) });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success('Test case removed from plan');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove test case: ${error.message}`);
    },
  });
}

export function useReorderPlanTestCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, orderedIds }: { planId: string; orderedIds: string[] }): Promise<void> => {
      const updates = orderedIds.map((testCaseId, index) =>
        supabase
          .from('tm_test_plan_cases')
          .update({ sort_order: index })
          .eq('test_plan_id', planId)
          .eq('test_case_id', testCaseId)
      );

      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.testCases(variables.planId) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder test cases: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Clone Plan
// ─────────────────────────────────────────────────────────────────────────────

export function useCloneTestPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, newName }: { planId: string; newName: string }): Promise<TestPlan> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get original plan
      const { data: original, error: fetchError } = await supabase
        .from('tm_test_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (fetchError) throw fetchError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cloneData: any = {
        name: newName,
        description: original.description,
        status: 'draft',
        release_id: original.release_id,
        start_date: null,
        end_date: null,
        objectives: original.objectives,
        in_scope: original.in_scope,
        out_of_scope: original.out_of_scope,
        test_strategy: original.test_strategy,
        environment_requirements: original.environment_requirements,
        owner_id: user?.id,
        created_by: user?.id,
      };

      const { data: newPlan, error: createError } = await supabase
        .from('tm_test_plans')
        .insert(cloneData)
        .select()
        .single();

      if (createError) throw createError;

      // Copy test cases
      const { data: cases } = await supabase
        .from('tm_test_plan_cases')
        .select('test_case_id, sort_order')
        .eq('test_plan_id', planId)
        .order('sort_order');

      if (cases && cases.length > 0) {
        const newCases = cases.map(c => ({
          test_plan_id: newPlan.id,
          test_case_id: c.test_case_id,
          sort_order: c.sort_order,
          added_by: user?.id,
        }));

        await supabase.from('tm_test_plan_cases').insert(newCases);
      }

      return mapToTestPlan(newPlan);
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success(`Plan cloned as "${plan.name}" (${plan.key})`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to clone plan: ${error.message}`);
    },
  });
}