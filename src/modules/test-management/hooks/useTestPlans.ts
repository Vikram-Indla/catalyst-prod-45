// ══════════════════════════════════════════════════════════════════════════════
// TEST PLANS - REACT QUERY HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  TestPlan,
  TestPlanWithStats,
  PlanTestCase,
  PlanTeamMember,
  CreateTestPlanInput,
  UpdateTestPlanInput,
  AddTestCasesToPlanInput,
  AddTeamMemberInput,
  TestPlanFilters,
  TestPlanStatus,
  PlanTeamRole,
} from '../types/testPlans';

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const testPlanKeys = {
  all: ['test-plans'] as const,
  lists: () => [...testPlanKeys.all, 'list'] as const,
  list: (filters?: TestPlanFilters) => [...testPlanKeys.lists(), filters] as const,
  detail: (id: string) => [...testPlanKeys.all, 'detail', id] as const,
  testCases: (planId: string) => [...testPlanKeys.all, 'test-cases', planId] as const,
  teamMembers: (planId: string) => [...testPlanKeys.all, 'team', planId] as const,
  stats: (planId: string) => [...testPlanKeys.all, 'stats', planId] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test Plans Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useTestPlans(filters?: TestPlanFilters) {
  return useQuery({
    queryKey: testPlanKeys.list(filters),
    queryFn: async (): Promise<TestPlanWithStats[]> => {
      let query = supabase
        .from('test_plans')
        .select(`
          *,
          release:releases(id, name, version),
          creator:profiles!test_plans_created_by_fkey(id, full_name, avatar_url)
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

      // Get counts for each plan
      const planIds = (data || []).map(p => p.id);
      
      // Get test case counts
      const { data: testCaseCounts } = await supabase
        .from('plan_test_cases')
        .select('plan_id')
        .in('plan_id', planIds);

      // Get team member counts
      const { data: teamCounts } = await supabase
        .from('plan_team_members')
        .select('plan_id')
        .in('plan_id', planIds);

      // Build count maps
      const testCaseCountMap = new Map<string, number>();
      const teamCountMap = new Map<string, number>();

      testCaseCounts?.forEach(tc => {
        const count = testCaseCountMap.get(tc.plan_id) || 0;
        testCaseCountMap.set(tc.plan_id, count + 1);
      });

      teamCounts?.forEach(tm => {
        const count = teamCountMap.get(tm.plan_id) || 0;
        teamCountMap.set(tm.plan_id, count + 1);
      });

      return (data || []).map(plan => ({
        ...plan,
        status: plan.status as TestPlanStatus,
        test_case_count: testCaseCountMap.get(plan.id) || 0,
        team_member_count: teamCountMap.get(plan.id) || 0,
        progress_percentage: 0, // TODO: Calculate from execution status
      }));
    },
  });
}

export function useTestPlan(planId: string | undefined) {
  return useQuery({
    queryKey: testPlanKeys.detail(planId || ''),
    queryFn: async (): Promise<TestPlan | null> => {
      if (!planId) return null;

      const { data, error } = await supabase
        .from('test_plans')
        .select(`
          *,
          release:releases(id, name, version),
          creator:profiles!test_plans_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;

      return {
        ...data,
        status: data.status as TestPlanStatus,
      };
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
        .from('plan_test_cases')
        .select(`
          *,
          test_case:tm_test_cases(id, case_key, title, status, priority_id, folder_id),
          assignee:profiles!plan_test_cases_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('plan_id', planId)
        .order('execution_order', { ascending: true, nullsFirst: false })
        .order('added_at', { ascending: true });

      if (error) throw error;

      return data || [];
    },
    enabled: !!planId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Team Members Queries
// ─────────────────────────────────────────────────────────────────────────────

export function usePlanTeamMembers(planId: string | undefined) {
  return useQuery({
    queryKey: testPlanKeys.teamMembers(planId || ''),
    queryFn: async (): Promise<PlanTeamMember[]> => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from('plan_team_members')
        .select(`
          *,
          user:profiles!plan_team_members_user_id_fkey(id, full_name, avatar_url, email)
        `)
        .eq('plan_id', planId)
        .order('role')
        .order('added_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(member => ({
        ...member,
        role: member.role as PlanTeamRole,
      }));
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
      
      const { data, error } = await supabase
        .from('test_plans')
        .insert({
          name: input.name,
          description: input.description || null,
          status: input.status || 'draft',
          release_id: input.release_id || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          objectives: input.objectives || null,
          scope_in: input.scope_in || null,
          scope_out: input.scope_out || null,
          test_strategy: input.test_strategy || null,
          environment_requirements: input.environment_requirements || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      return data as TestPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success('Test plan created successfully');
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
      const { data, error } = await supabase
        .from('test_plans')
        .update({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.release_id !== undefined && { release_id: input.release_id }),
          ...(input.start_date !== undefined && { start_date: input.start_date }),
          ...(input.end_date !== undefined && { end_date: input.end_date }),
          ...(input.objectives !== undefined && { objectives: input.objectives }),
          ...(input.scope_in !== undefined && { scope_in: input.scope_in }),
          ...(input.scope_out !== undefined && { scope_out: input.scope_out }),
          ...(input.test_strategy !== undefined && { test_strategy: input.test_strategy }),
          ...(input.environment_requirements !== undefined && { environment_requirements: input.environment_requirements }),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as TestPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.detail(data.id) });
      toast.success('Test plan updated successfully');
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
        .from('test_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success('Test plan deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete test plan: ${error.message}`);
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
      const records = input.test_case_ids.map((testCaseId, index) => ({
        plan_id: input.plan_id,
        test_case_id: testCaseId,
        execution_order: index + 1,
        assigned_to: input.assigned_to || null,
      }));

      const { error } = await supabase
        .from('plan_test_cases')
        .insert(records);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.testCases(variables.plan_id) });
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
        .from('plan_test_cases')
        .delete()
        .eq('plan_id', planId)
        .eq('test_case_id', testCaseId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.testCases(variables.planId) });
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
      // Update execution_order for each test case
      const updates = orderedIds.map((testCaseId, index) =>
        supabase
          .from('plan_test_cases')
          .update({ execution_order: index + 1 })
          .eq('plan_id', planId)
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
// Plan Team Members Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddTeamMemberInput): Promise<void> => {
      const { error } = await supabase
        .from('plan_team_members')
        .insert({
          plan_id: input.plan_id,
          user_id: input.user_id,
          role: input.role,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.teamMembers(variables.plan_id) });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success('Team member added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add team member: ${error.message}`);
    },
  });
}

export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, userId, role }: { planId: string; userId: string; role: PlanTeamRole }): Promise<void> => {
      const { error } = await supabase
        .from('plan_team_members')
        .update({ role })
        .eq('plan_id', planId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.teamMembers(variables.planId) });
      toast.success('Team member role updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, userId }: { planId: string; userId: string }): Promise<void> => {
      const { error } = await supabase
        .from('plan_team_members')
        .delete()
        .eq('plan_id', planId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testPlanKeys.teamMembers(variables.planId) });
      queryClient.invalidateQueries({ queryKey: testPlanKeys.all });
      toast.success('Team member removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove team member: ${error.message}`);
    },
  });
}
