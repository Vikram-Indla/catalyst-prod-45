/**
 * Project Test Metrics Hooks
 * Real Supabase data for project-scoped test management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

const supabase = supabaseClient as any;

export interface TestSummary {
  totalCases: number;
  passRate: number;
  failed: number;
  blocked: number;
  notRun: number;
  passed: number;
}

export interface RecentFailure {
  id: string;
  testCaseId: string;
  testCaseTitle: string;
  featureName: string | null;
  executedAt: string;
  cycleKey: string | null;
}

export interface FeatureCoverage {
  featureId: string;
  featureName: string;
  totalCases: number;
  coverage: number;
}

export interface CycleProgress {
  id: string;
  name: string;
  key: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  progress: number;
}

/**
 * Get test summary metrics for a project
 */
export function useProjectTestSummary(projectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-test-summary', projectId],
    queryFn: async (): Promise<TestSummary> => {
      if (!projectId) {
        return { totalCases: 0, passRate: 0, failed: 0, blocked: 0, notRun: 0, passed: 0 };
      }

      const { count: casesCount } = await supabase
        .from('test_cases')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const { data: cycles } = await supabase
        .from('test_cycles')
        .select(`id, test_cycle_executions(status)`)
        .eq('project_id', projectId)
        .eq('archived', false);

      let passed = 0, failed = 0, blocked = 0, notRun = 0;

      cycles?.forEach((cycle: any) => {
        cycle.test_cycle_executions?.forEach((exec: any) => {
          switch (exec.status) {
            case 'passed': passed++; break;
            case 'failed': failed++; break;
            case 'blocked': blocked++; break;
            default: notRun++;
          }
        });
      });

      const totalExecutions = passed + failed + blocked + notRun;
      const passRate = totalExecutions > 0 ? Math.round((passed / totalExecutions) * 100) : 0;

      return { totalCases: casesCount || 0, passRate, passed, failed, blocked, notRun };
    },
    enabled: !!user && !!projectId,
    staleTime: 30000,
  });
}

/**
 * Get recent test failures for a project
 */
export function useProjectRecentFailures(projectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-recent-failures', projectId],
    queryFn: async (): Promise<RecentFailure[]> => {
      if (!projectId) return [];

      const { data: failures } = await supabase
        .from('test_cycle_executions')
        .select(`
          id, case_id, status, executed_at,
          test_case:test_cases(id, title),
          test_cycle:test_cycles(key, project_id)
        `)
        .eq('status', 'failed')
        .order('executed_at', { ascending: false })
        .limit(20);

      return (failures || [])
        .filter((f: any) => f.test_cycle?.project_id === projectId)
        .slice(0, 10)
        .map((f: any) => ({
          id: f.id,
          testCaseId: f.case_id,
          testCaseTitle: f.test_case?.title || 'Unknown',
          featureName: null,
          executedAt: f.executed_at,
          cycleKey: f.test_cycle?.key,
        }));
    },
    enabled: !!user && !!projectId,
    staleTime: 30000,
  });
}

/**
 * Get test coverage by feature for a project
 */
export function useProjectCoverageByFeature(projectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-coverage-by-feature', projectId],
    queryFn: async (): Promise<FeatureCoverage[]> => {
      if (!projectId) return [];

      const { data: features } = await supabase
        .from('features')
        .select('id, name')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .limit(10);

      if (!features?.length) return [];

      const { data: stories } = await supabase
        .from('stories')
        .select('id, feature_id')
        .in('feature_id', features.map(f => f.id))
        .is('deleted_at', null);

      if (!stories?.length) {
        return features.map(f => ({ featureId: f.id, featureName: f.name, totalCases: 0, coverage: 0 }));
      }

      const { data: testLinks } = await supabase
        .from('test_case_work_items')
        .select('test_case_id, work_item_id')
        .in('work_item_id', stories.map(s => s.id))
        .eq('work_item_type', 'story');

      const featureCaseCounts: Record<string, number> = {};
      const storyToFeature: Record<string, string> = {};
      stories.forEach(s => { if (s.feature_id) storyToFeature[s.id] = s.feature_id; });
      testLinks?.forEach(link => {
        const fid = storyToFeature[link.work_item_id];
        if (fid) featureCaseCounts[fid] = (featureCaseCounts[fid] || 0) + 1;
      });

      return features.map(f => ({
        featureId: f.id,
        featureName: f.name,
        totalCases: featureCaseCounts[f.id] || 0,
        coverage: featureCaseCounts[f.id] ? Math.min(100, featureCaseCounts[f.id] * 20) : 0,
      }));
    },
    enabled: !!user && !!projectId,
    staleTime: 60000,
  });
}

/**
 * Get active cycle progress for a project
 */
export function useProjectCycleProgress(projectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-cycle-progress', projectId],
    queryFn: async (): Promise<CycleProgress[]> => {
      if (!projectId) return [];

      const { data: cycles } = await supabase
        .from('test_cycles')
        .select(`id, name, key, test_cycle_executions(status)`)
        .eq('project_id', projectId)
        .eq('archived', false)
        .in('status', ['active', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5);

      return (cycles || []).map((cycle: any) => {
        const execs = cycle.test_cycle_executions || [];
        const total = execs.length;
        const passed = execs.filter((e: any) => e.status === 'passed').length;
        const failed = execs.filter((e: any) => e.status === 'failed').length;
        const blocked = execs.filter((e: any) => e.status === 'blocked').length;
        const notRun = total - passed - failed - blocked;
        return { id: cycle.id, name: cycle.name, key: cycle.key, total, passed, failed, blocked, notRun, progress: total > 0 ? Math.round(((passed + failed + blocked) / total) * 100) : 0 };
      });
    },
    enabled: !!user && !!projectId,
    staleTime: 30000,
  });
}

/**
 * Project-scoped test cases CRUD
 */
export function useProjectTestCases(projectId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: testCases, isLoading, error, refetch } = useQuery({
    queryKey: ['project-test-cases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: { title: string; description?: string; preconditions?: string; test_type?: string; priority?: string; status?: string; linked_work_item_id?: string; component?: string; objective?: string; }) => {
      if (!user) throw new Error('Not authenticated');
      if (!projectId) throw new Error('No project context');

      const { data, error } = await supabase
        .from('test_cases')
        .insert({
          title: input.title,
          description: input.description || null,
          preconditions: input.preconditions || null,
          test_type: (input.test_type || 'manual') as any,
          priority: (input.priority || 'medium') as any,
          status: (input.status || 'draft') as any,
          linked_work_item_type: input.linked_work_item_id ? 'story' : null,
          linked_work_item_id: input.linked_work_item_id || null,
          project_id: projectId,
          component: input.component || null,
          objective: input.objective || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (input.linked_work_item_id) {
        await supabase.from('test_case_work_items').insert({ test_case_id: data.id, work_item_id: input.linked_work_item_id, work_item_type: 'story', link_type: 'tests', created_by: user.id });
      }

      await logAuditEntry({ entityType: 'test_cases', entityId: data.id, action: 'created', afterData: data });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-test-cases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-test-summary', projectId] });
      toast.success('Test case created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; [key: string]: any }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: before } = await supabase.from('test_cases').select('*').eq('id', input.id).single();
      const { id, ...updateData } = input;
      const { data, error } = await supabase.from('test_cases').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      await logAuditEntry({ entityType: 'test_cases', entityId: data.id, action: 'updated', beforeData: before, afterData: data });
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project-test-cases', projectId] }); toast.success('Test case updated'); },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data: before } = await supabase.from('test_cases').select('*').eq('id', id).single();
      const { error } = await supabase.from('test_cases').update({ deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', id);
      if (error) throw error;
      await logAuditEntry({ entityType: 'test_cases', entityId: id, action: 'deleted', beforeData: before });
      return id;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project-test-cases', projectId] }); queryClient.invalidateQueries({ queryKey: ['project-test-summary', projectId] }); toast.success('Test case deleted'); },
    onError: (error: Error) => toast.error(error.message),
  });

  return { testCases: testCases || [], isLoading, error, refetch, createTestCase: createMutation.mutateAsync, updateTestCase: updateMutation.mutateAsync, deleteTestCase: deleteMutation.mutateAsync, isCreating: createMutation.isPending, isUpdating: updateMutation.isPending, isDeleting: deleteMutation.isPending };
}

/**
 * Project-scoped test cycles
 */
export function useProjectTestCycles(projectId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cycles, isLoading, error } = useQuery({
    queryKey: ['project-test-cycles', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase.from('test_cycles').select(`*, test_cycle_executions(id, status)`).eq('project_id', projectId).eq('archived', false).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; description?: string; start_date?: string; end_date?: string; }) => {
      if (!user) throw new Error('Not authenticated');
      if (!projectId) throw new Error('No project context');
      const count = (cycles?.length || 0) + 1;
      const key = `CYC-${count.toString().padStart(3, '0')}`;
      const { data, error } = await supabase.from('test_cycles').insert({ name: input.name, description: input.description || null, start_date: input.start_date || null, end_date: input.end_date || null, key, project_id: projectId, status: 'planned', created_by: user.id }).select().single();
      if (error) throw error;
      await logAuditEntry({ entityType: 'test_cycles', entityId: data.id, action: 'created', afterData: data });
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project-test-cycles', projectId] }); toast.success('Test cycle created'); },
    onError: (error: Error) => toast.error(error.message),
  });

  return { cycles: cycles || [], isLoading, error, createCycle: createMutation.mutateAsync, isCreating: createMutation.isPending };
}

/**
 * Project-scoped execution runs
 */
export function useProjectExecutions(projectId: string | null, cycleId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: executions, isLoading, error } = useQuery({
    queryKey: ['project-executions', projectId, cycleId],
    queryFn: async () => {
      if (!projectId) return [];
      let query = supabase.from('test_cycle_executions').select(`*, test_case:test_cases(id, title, priority, test_type), test_cycle:test_cycles(id, name, key, project_id)`).order('created_at', { ascending: false }).limit(100);
      if (cycleId) query = query.eq('cycle_id', cycleId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).filter((e: any) => e.test_cycle?.project_id === projectId);
    },
    enabled: !!user && !!projectId,
  });

  const updateExecutionMutation = useMutation({
    mutationFn: async (input: { id: string; status: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: before } = await supabase.from('test_cycle_executions').select('*').eq('id', input.id).single();
      const { data, error } = await supabase.from('test_cycle_executions').update({ status: input.status, notes: input.notes || null, executed_at: new Date().toISOString(), executed_by: user.id }).eq('id', input.id).select().single();
      if (error) throw error;
      await logAuditEntry({ entityType: 'test_executions', entityId: data.id, action: 'status_changed', beforeData: before, afterData: data });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-executions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-test-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-recent-failures', projectId] });
      toast.success('Execution updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { executions: executions || [], isLoading, error, updateExecution: updateExecutionMutation.mutateAsync, isUpdating: updateExecutionMutation.isPending };
}
