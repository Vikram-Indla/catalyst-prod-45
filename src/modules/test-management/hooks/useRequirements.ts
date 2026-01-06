// ══════════════════════════════════════════════════════════════════════════════
// REQUIREMENTS TRACEABILITY - REACT QUERY HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  Requirement,
  RequirementWithCoverage,
  RequirementCreate,
  RequirementUpdate,
  RequirementTestLink,
  ProjectCoverageStats,
  GapAnalysis,
  SyncStatus,
} from '../types/requirements';

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const requirementKeys = {
  all: ['requirements'] as const,
  lists: () => [...requirementKeys.all, 'list'] as const,
  list: (projectId: string) => [...requirementKeys.lists(), projectId] as const,
  tree: (projectId: string) => [...requirementKeys.all, 'tree', projectId] as const,
  detail: (id: string) => [...requirementKeys.all, 'detail', id] as const,
  links: (requirementId: string) => [...requirementKeys.all, 'links', requirementId] as const,
  coverage: (projectId: string) => [...requirementKeys.all, 'coverage', projectId] as const,
  gaps: (projectId: string) => [...requirementKeys.all, 'gaps', projectId] as const,
  testCases: (projectId: string) => [...requirementKeys.all, 'test-cases', projectId] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Requirements Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useRequirements(projectId: string | undefined) {
  return useQuery({
    queryKey: requirementKeys.list(projectId || ''),
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('requirements')
        .select(`
          *,
          owner:profiles(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('sort_order')
        .order('requirement_key');

      if (error) throw error;
      
      // Map sync_status to proper type
      return (data || []).map(r => ({
        ...r,
        sync_status: (r.sync_status || 'synced') as SyncStatus,
      })) as Requirement[];
    },
    enabled: !!projectId,
  });
}

export function useRequirementTree(projectId: string | undefined) {
  return useQuery({
    queryKey: requirementKeys.tree(projectId || ''),
    queryFn: async () => {
      if (!projectId) return [];
      
      // Get all requirements with their links count
      const { data: requirements, error } = await supabase
        .from('requirements')
        .select(`
          *,
          owner:profiles(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('sort_order')
        .order('requirement_key');

      if (error) throw error;

      // Get link counts
      const { data: linkCounts, error: linkError } = await supabase
        .from('requirement_test_links')
        .select('requirement_id');

      if (linkError) throw linkError;

      // Count links per requirement
      const linkCountMap = new Map<string, number>();
      linkCounts?.forEach(link => {
        const count = linkCountMap.get(link.requirement_id) || 0;
        linkCountMap.set(link.requirement_id, count + 1);
      });

      // Build tree structure
      const reqMap = new Map<string, RequirementWithCoverage>();
      const roots: RequirementWithCoverage[] = [];

      requirements?.forEach(req => {
        const withCoverage: RequirementWithCoverage = {
          ...req,
          sync_status: (req.sync_status || 'synced') as SyncStatus,
          linked_tests_count: linkCountMap.get(req.id) || 0,
          coverage_percentage: linkCountMap.get(req.id) ? 100 : 0,
          pass_rate: 0,
          has_children: false,
          children: [],
        };
        reqMap.set(req.id, withCoverage);
      });

      // Build tree
      reqMap.forEach(req => {
        if (req.parent_id && reqMap.has(req.parent_id)) {
          const parent = reqMap.get(req.parent_id)!;
          parent.has_children = true;
          parent.children = parent.children || [];
          parent.children.push(req);
        } else {
          roots.push(req);
        }
      });

      return roots;
    },
    enabled: !!projectId,
  });
}

export function useRequirement(requirementId: string | undefined) {
  return useQuery({
    queryKey: requirementKeys.detail(requirementId || ''),
    queryFn: async () => {
      if (!requirementId) return null;
      
      const { data, error } = await supabase
        .from('requirements')
        .select(`
          *,
          owner:profiles(id, full_name, avatar_url)
        `)
        .eq('id', requirementId)
        .single();

      if (error) throw error;
      return {
        ...data,
        sync_status: (data.sync_status || 'synced') as SyncStatus,
      } as Requirement;
    },
    enabled: !!requirementId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Requirement Links
// ─────────────────────────────────────────────────────────────────────────────

export function useRequirementLinks(requirementId: string | undefined) {
  return useQuery({
    queryKey: requirementKeys.links(requirementId || ''),
    queryFn: async () => {
      if (!requirementId) return [];
      
      const { data, error } = await supabase
        .from('requirement_test_links')
        .select(`
          *,
          test_case:tm_test_cases(id, case_key, title, priority_id, status)
        `)
        .eq('requirement_id', requirementId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get latest execution for each test case via tm_cycle_scope
      const testCaseIds = data?.map(l => l.test_case_id) || [];
      
      if (testCaseIds.length > 0) {
        const { data: scopes } = await supabase
          .from('tm_cycle_scope')
          .select('test_case_id, current_status')
          .in('test_case_id', testCaseIds);

        // Get latest status per test case
        const latestStatusMap = new Map<string, string>();
        scopes?.forEach(scope => {
          if (scope.current_status) {
            latestStatusMap.set(scope.test_case_id, scope.current_status);
          }
        });

        return data?.map(link => ({
          ...link,
          link_type: (link.link_type || 'covers') as 'covers' | 'verifies' | 'validates',
          test_case: link.test_case ? {
            id: (link.test_case as any).id,
            test_key: (link.test_case as any).case_key,
            title: (link.test_case as any).title,
            priority: (link.test_case as any).priority_id || 'medium',
            status: (link.test_case as any).status || 'draft',
          } : undefined,
          latest_execution: latestStatusMap.has(link.test_case_id) ? {
            status: latestStatusMap.get(link.test_case_id) || 'not_run',
            executed_at: '',
          } : undefined,
        })) as RequirementTestLink[];
      }

      return data?.map(link => ({
        ...link,
        link_type: (link.link_type || 'covers') as 'covers' | 'verifies' | 'validates',
        test_case: link.test_case ? {
          id: (link.test_case as any).id,
          test_key: (link.test_case as any).case_key,
          title: (link.test_case as any).title,
          priority: (link.test_case as any).priority_id || 'medium',
          status: (link.test_case as any).status || 'draft',
        } : undefined,
      })) as RequirementTestLink[];
    },
    enabled: !!requirementId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage Stats
// ─────────────────────────────────────────────────────────────────────────────

export function useProjectCoverageStats(projectId: string | undefined) {
  return useQuery({
    queryKey: requirementKeys.coverage(projectId || ''),
    queryFn: async (): Promise<ProjectCoverageStats> => {
      if (!projectId) {
        return {
          project_id: '',
          total_requirements: 0,
          covered_requirements: 0,
          uncovered_requirements: 0,
          coverage_percentage: 0,
          total_linked_tests: 0,
          total_test_cases: 0,
          orphan_test_cases: 0,
          executed_tests: 0,
          passed_tests: 0,
          failed_tests: 0,
          blocked_tests: 0,
          pass_rate: 0,
        };
      }

      // Get total requirements
      const { count: totalReqs } = await supabase
        .from('requirements')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get requirements IDs first
      const { data: reqIds } = await supabase
        .from('requirements')
        .select('id')
        .eq('project_id', projectId);

      // Get all links for these requirements
      const { data: links } = await supabase
        .from('requirement_test_links')
        .select('requirement_id, test_case_id')
        .in('requirement_id', reqIds?.map(r => r.id) || []);

      const coveredReqIds = new Set(links?.map(l => l.requirement_id) || []);
      const linkedTestIds = new Set(links?.map(l => l.test_case_id) || []);

      // Get total test cases
      const { count: totalTests } = await supabase
        .from('tm_test_cases')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get execution stats from tm_cycle_scope
      const { data: scopes } = await supabase
        .from('tm_cycle_scope')
        .select('test_case_id, current_status')
        .in('test_case_id', Array.from(linkedTestIds));

      // Count by status
      const statusCounts = { passed: 0, failed: 0, blocked: 0, executed: new Set<string>() };
      scopes?.forEach(scope => {
        if (scope.current_status) {
          statusCounts.executed.add(scope.test_case_id);
          if (scope.current_status === 'passed') statusCounts.passed++;
          else if (scope.current_status === 'failed') statusCounts.failed++;
          else if (scope.current_status === 'blocked') statusCounts.blocked++;
        }
      });

      const total = totalReqs || 0;
      const covered = coveredReqIds.size;
      const totalTestCount = totalTests || 0;
      const executedCount = statusCounts.executed.size;

      return {
        project_id: projectId,
        total_requirements: total,
        covered_requirements: covered,
        uncovered_requirements: total - covered,
        coverage_percentage: total > 0 ? Math.round((covered / total) * 100) : 0,
        total_linked_tests: linkedTestIds.size,
        total_test_cases: totalTestCount,
        orphan_test_cases: totalTestCount - linkedTestIds.size,
        executed_tests: executedCount,
        passed_tests: statusCounts.passed,
        failed_tests: statusCounts.failed,
        blocked_tests: statusCounts.blocked,
        pass_rate: executedCount > 0 ? Math.round((statusCounts.passed / executedCount) * 100) : 0,
      };
    },
    enabled: !!projectId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Gap Analysis
// ─────────────────────────────────────────────────────────────────────────────

export function useGapAnalysis(projectId: string | undefined) {
  return useQuery({
    queryKey: requirementKeys.gaps(projectId || ''),
    queryFn: async (): Promise<GapAnalysis> => {
      if (!projectId) {
        return {
          uncovered_requirements: [],
          orphan_test_cases: [],
          failing_requirements: [],
          partial_coverage: [],
        };
      }

      // Get all requirements
      const { data: requirements } = await supabase
        .from('requirements')
        .select('id, requirement_key, title, type, priority')
        .eq('project_id', projectId);

      // Get all links
      const { data: links } = await supabase
        .from('requirement_test_links')
        .select('requirement_id, test_case_id');

      // Get all test cases
      const { data: testCases } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, priority_id')
        .eq('project_id', projectId);

      const linkedReqIds = new Set(links?.map(l => l.requirement_id) || []);
      const linkedTestIds = new Set(links?.map(l => l.test_case_id) || []);

      // Uncovered requirements
      const uncovered = (requirements || [])
        .filter(r => !linkedReqIds.has(r.id))
        .map(r => ({
          id: r.id,
          key: r.requirement_key,
          title: r.title,
          type: r.type as any,
          priority: r.priority as any,
        }));

      // Orphan test cases
      const orphans = (testCases || [])
        .filter(tc => !linkedTestIds.has(tc.id))
        .map(tc => ({
          id: tc.id,
          key: tc.case_key,
          title: tc.title,
          priority: tc.priority_id || 'medium',
        }));

      return {
        uncovered_requirements: uncovered,
        orphan_test_cases: orphans,
        failing_requirements: [],
        partial_coverage: [],
      };
    },
    enabled: !!projectId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Available Test Cases (for linking)
// ─────────────────────────────────────────────────────────────────────────────

export function useAvailableTestCases(projectId: string | undefined) {
  return useQuery({
    queryKey: requirementKeys.testCases(projectId || ''),
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, priority_id, status')
        .eq('project_id', projectId)
        .order('case_key');

      if (error) throw error;
      return (data || []).map(tc => ({
        id: tc.id,
        test_key: tc.case_key,
        title: tc.title,
        priority: tc.priority_id || 'medium',
        status: tc.status || 'draft',
      }));
    },
    enabled: !!projectId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: RequirementCreate }) => {
      // Generate key if not provided
      let key = data.requirement_key;
      if (!key) {
        const prefix = data.type === 'epic' ? 'EPIC' :
                       data.type === 'feature' ? 'FEAT' :
                       data.type === 'story' ? 'STORY' : 'REQ';
        
        const { data: lastReq } = await supabase
          .from('requirements')
          .select('requirement_key')
          .eq('project_id', projectId)
          .ilike('requirement_key', `${prefix}-%`)
          .order('requirement_key', { ascending: false })
          .limit(1)
          .single();
        
        const lastNum = lastReq ? parseInt(lastReq.requirement_key.split('-')[1]) : 0;
        key = `${prefix}-${String(lastNum + 1).padStart(3, '0')}`;
      }

      const { data: result, error } = await supabase
        .from('requirements')
        .insert({
          project_id: projectId,
          requirement_key: key,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: requirementKeys.tree(projectId) });
      toast.success('Requirement created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create requirement: ${error.message}`);
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RequirementUpdate }) => {
      const { data: result, error } = await supabase
        .from('requirements')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.list(result.project_id) });
      queryClient.invalidateQueries({ queryKey: requirementKeys.tree(result.project_id) });
      queryClient.invalidateQueries({ queryKey: requirementKeys.detail(result.id) });
      toast.success('Requirement updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update requirement: ${error.message}`);
    },
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: requirementKeys.tree(projectId) });
      toast.success('Requirement deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete requirement: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Link Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useLinkTestCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requirementId, testCaseIds, linkType = 'covers' }: { 
      requirementId: string; 
      testCaseIds: string[]; 
      linkType?: string;
    }) => {
      const links = testCaseIds.map(testCaseId => ({
        requirement_id: requirementId,
        test_case_id: testCaseId,
        link_type: linkType,
      }));

      const { error } = await supabase
        .from('requirement_test_links')
        .upsert(links, { onConflict: 'requirement_id,test_case_id' });

      if (error) throw error;
    },
    onSuccess: (_, { requirementId }) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.links(requirementId) });
      queryClient.invalidateQueries({ queryKey: requirementKeys.all });
      toast.success('Test cases linked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to link test cases: ${error.message}`);
    },
  });
}

export function useUnlinkTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requirementId, testCaseId }: { requirementId: string; testCaseId: string }) => {
      const { error } = await supabase
        .from('requirement_test_links')
        .delete()
        .eq('requirement_id', requirementId)
        .eq('test_case_id', testCaseId);

      if (error) throw error;
    },
    onSuccess: (_, { requirementId }) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.links(requirementId) });
      queryClient.invalidateQueries({ queryKey: requirementKeys.all });
      toast.success('Test case unlinked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink test case: ${error.message}`);
    },
  });
}
