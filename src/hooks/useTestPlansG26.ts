/**
 * G26 Test Plans Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TestPlan, PlanFilters, PlanProgress, PlanScope, PlanTeamMember, PlanApproval } from '@/types/testPlans';
import { toast } from 'sonner';

// ─── List Plans ──────────────────────────────────────────────────
export function useTestPlans(filters?: PlanFilters) {
  return useQuery({
    queryKey: ['g26-test-plans', filters],
    queryFn: async (): Promise<TestPlan[]> => {
      let query = supabase
        .from('tm_test_plans' as any)
        .select(`*, creator:profiles!tm_test_plans_created_by_fkey(id, full_name, avatar_url), release:releases!tm_test_plans_release_id_fkey(id, name)`)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (filters?.status?.length) query = query.in('status', filters.status);
      if (filters?.releaseId) query = query.eq('release_id', filters.releaseId);
      if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,plan_key.ilike.%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as unknown as TestPlan[];
    },
  });
}

// ─── Single Plan ─────────────────────────────────────────────────
export function useTestPlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['g26-test-plan', planId],
    queryFn: async (): Promise<TestPlan | null> => {
      if (!planId) return null;
      const { data, error } = await supabase
        .from('tm_test_plans' as any)
        .select(`*, creator:profiles!tm_test_plans_created_by_fkey(id, full_name, avatar_url), release:releases!tm_test_plans_release_id_fkey(id, name)`)
        .eq('id', planId)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as TestPlan;
    },
    enabled: !!planId,
  });
}

// ─── Progress ────────────────────────────────────────────────────
export function usePlanProgress(planId: string) {
  return useQuery({
    queryKey: ['g26-plan-progress', planId],
    queryFn: async (): Promise<PlanProgress> => {
      const { data, error } = await supabase.rpc('get_plan_progress', { p_plan_id: planId });
      if (error) throw new Error(error.message);
      return data as unknown as PlanProgress;
    },
    enabled: !!planId,
  });
}

// ─── Create ──────────────────────────────────────────────────────
export function useCreateTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tm_test_plans' as any)
        .insert({ ...plan, created_by: user.id, plan_key: '' } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as any;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['g26-test-plans'] });
      toast.success(`Plan ${data.plan_key} created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Update ──────────────────────────────────────────────────────
export function useUpdateTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from('tm_test_plans' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as any;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['g26-test-plans'] });
      qc.invalidateQueries({ queryKey: ['g26-test-plan', data.id] });
      toast.success('Plan updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Delete ──────────────────────────────────────────────────────
export function useDeleteTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from('tm_test_plans' as any).delete().eq('id', planId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['g26-test-plans'] });
      toast.success('Plan deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Templates ───────────────────────────────────────────────────
export function useTemplates() {
  return useQuery({
    queryKey: ['g26-plan-templates'],
    queryFn: async (): Promise<TestPlan[]> => {
      const { data, error } = await supabase
        .from('tm_test_plans' as any)
        .select('*')
        .eq('is_template', true)
        .order('template_name');
      if (error) throw new Error(error.message);
      return (data || []) as unknown as TestPlan[];
    },
  });
}

export function useSaveAsTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, templateName }: { planId: string; templateName: string }) => {
      const { data: plan } = await supabase.from('tm_test_plans' as any).select('*').eq('id', planId).single();
      if (!plan) throw new Error('Plan not found');
      const { data: { user } } = await supabase.auth.getUser();
      const p = plan as any;
      const { data, error } = await supabase.from('tm_test_plans' as any).insert({
        name: p.name, description: p.description, objectives: p.objectives,
        entry_criteria: p.entry_criteria, exit_criteria: p.exit_criteria, risks_assumptions: p.risks_assumptions,
        project_id: p.project_id, created_by: user?.id, is_template: true,
        template_name: templateName, plan_key: `TPL-${Date.now().toString(36).toUpperCase()}`,
      } as any).select().single();
      if (error) throw new Error(error.message);
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['g26-plan-templates'] });
      toast.success('Template created');
    },
  });
}

// ─── Scope ───────────────────────────────────────────────────────
export function usePlanScope(planId: string) {
  return useQuery({
    queryKey: ['g26-plan-scope', planId],
    queryFn: async (): Promise<PlanScope[]> => {
      const { data, error } = await supabase
        .from('tm_plan_scope' as any)
        .select('*')
        .eq('plan_id', planId)
        .order('added_at', { ascending: false });
      if (error) throw new Error(error.message);

      const items = (data || []) as unknown as PlanScope[];
      for (const item of items) {
        if (item.scope_type === 'folder') {
          const { data: folder } = await supabase.from('tm_folders' as any).select('id, name').eq('id', item.entity_id).single();
          if (folder) item.folder = folder as any;
        } else if (item.scope_type === 'test_case') {
          const { data: tc } = await supabase.from('tm_test_cases' as any).select('id, case_key, title').eq('id', item.entity_id).single();
          if (tc) item.test_case = tc as any;
        }
      }
      return items;
    },
    enabled: !!planId,
  });
}

export function useScopeSummary(planId: string) {
  return useQuery({
    queryKey: ['g26-scope-summary', planId],
    queryFn: async () => {
      const { data: folders } = await supabase.from('tm_plan_scope' as any).select('entity_id').eq('plan_id', planId).eq('scope_type', 'folder').eq('action', 'include');
      const { data: testCases } = await supabase.from('tm_plan_scope' as any).select('entity_id').eq('plan_id', planId).eq('scope_type', 'test_case').eq('action', 'include');
      const { data: excluded } = await supabase.from('tm_plan_scope' as any).select('entity_id').eq('plan_id', planId).eq('action', 'exclude');

      const folderIds = (folders as any)?.map((f: any) => f.entity_id) || [];
      let testsFromFolders = 0;
      if (folderIds.length > 0) {
        const { count } = await supabase.from('tm_test_cases' as any).select('*', { count: 'exact', head: true }).in('folder_id', folderIds).eq('is_active', true);
        testsFromFolders = count || 0;
      }

      return {
        folders: folderIds.length,
        direct_tests: (testCases as any)?.length || 0,
        excluded: (excluded as any)?.length || 0,
        total_tests: Math.max(0, testsFromFolders + ((testCases as any)?.length || 0) - ((excluded as any)?.length || 0)),
      };
    },
    enabled: !!planId,
  });
}

export function useAddToScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, scopeType, entityId, action = 'include' }: { planId: string; scopeType: string; entityId: string; action?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('tm_plan_scope' as any)
        .insert({ plan_id: planId, scope_type: scopeType, entity_id: entityId, action, added_by: user?.id } as any)
        .select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['g26-plan-scope', v.planId] });
      qc.invalidateQueries({ queryKey: ['g26-scope-summary', v.planId] });
      toast.success('Added to scope');
    },
  });
}

export function useRemoveFromScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scopeId, planId }: { scopeId: string; planId: string }) => {
      const { error } = await supabase.from('tm_plan_scope' as any).delete().eq('id', scopeId);
      if (error) throw new Error(error.message);
      return planId;
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: ['g26-plan-scope', planId] });
      qc.invalidateQueries({ queryKey: ['g26-scope-summary', planId] });
      toast.success('Removed from scope');
    },
  });
}

// ─── Team ────────────────────────────────────────────────────────
export function usePlanTeam(planId: string) {
  return useQuery({
    queryKey: ['g26-plan-team', planId],
    queryFn: async (): Promise<PlanTeamMember[]> => {
      const { data, error } = await supabase
        .from('tm_plan_team' as any)
        .select(`*, user:profiles!tm_plan_team_user_id_fkey(id, full_name, avatar_url)`)
        .eq('plan_id', planId)
        .order('assigned_at');
      if (error) throw new Error(error.message);
      return (data || []) as unknown as PlanTeamMember[];
    },
    enabled: !!planId,
  });
}

export function useAddTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, userId, role = 'tester' }: { planId: string; userId: string; role?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('tm_plan_team' as any)
        .insert({ plan_id: planId, user_id: userId, role, assigned_by: user?.id } as any)
        .select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['g26-plan-team', v.planId] });
      toast.success('Team member added');
    },
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, planId }: { memberId: string; planId: string }) => {
      const { error } = await supabase.from('tm_plan_team' as any).delete().eq('id', memberId);
      if (error) throw new Error(error.message);
      return planId;
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: ['g26-plan-team', planId] });
      toast.success('Team member removed');
    },
  });
}

// ─── Approvals ───────────────────────────────────────────────────
export function usePlanApprovals(planId: string) {
  return useQuery({
    queryKey: ['g26-plan-approvals', planId],
    queryFn: async (): Promise<PlanApproval[]> => {
      const { data, error } = await supabase
        .from('tm_plan_approvals' as any)
        .select(`*, approver:profiles!tm_plan_approvals_approver_id_fkey(id, full_name, avatar_url)`)
        .eq('plan_id', planId)
        .order('requested_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as PlanApproval[];
    },
    enabled: !!planId,
  });
}

export function useRequestApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, approverId }: { planId: string; approverId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('tm_plan_approvals' as any)
        .insert({ plan_id: planId, approver_id: approverId, requested_by: user?.id } as any)
        .select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['g26-plan-approvals', v.planId] });
      toast.success('Approval requested');
    },
  });
}

export function useApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ approvalId, planId, comments }: { approvalId: string; planId: string; comments?: string }) => {
      const { data, error } = await supabase.from('tm_plan_approvals' as any)
        .update({ status: 'approved', comments, decided_at: new Date().toISOString() } as any)
        .eq('id', approvalId).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['g26-plan-approvals', v.planId] });
      toast.success('Plan approved');
    },
  });
}

export function useReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ approvalId, planId, comments }: { approvalId: string; planId: string; comments: string }) => {
      const { data, error } = await supabase.from('tm_plan_approvals' as any)
        .update({ status: 'rejected', comments, decided_at: new Date().toISOString() } as any)
        .eq('id', approvalId).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['g26-plan-approvals', v.planId] });
      toast.success('Plan rejected');
    },
  });
}
