/**
 * Issue Test Cases Hook
 * Manages test cases linked to a work item (story/feature/defect)
 * Used in the Jira Issue Drawer for test management integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

const supabase = supabaseClient as any;

export type WorkItemType = 'story' | 'feature' | 'defect' | 'epic';

export interface LinkedTestCase {
  id: string;
  title: string;
  status: string;
  priority: string;
  test_type: string;
  case_key?: string;
  linked_at: string;
  link_id: string;
  // Latest execution info
  last_execution_status?: string;
  last_executed_at?: string;
}

export interface TestCaseForLinking {
  id: string;
  title: string;
  status: string;
  priority: string;
  test_type: string;
  folder_name?: string;
}

export interface CreateCaseFromIssueInput {
  title: string;
  description?: string;
  preconditions?: string;
  expected_result?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  programId: string;
  workItemId: string;
  workItemType: WorkItemType;
}

async function logTestActivity(
  userId: string | undefined,
  activityType: string,
  entityId: string,
  entityTitle: string,
  programId: string | null,
  description?: string
) {
  try {
    await supabase.from('test_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      entity_type: 'test_case',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useIssueTestCases(
  workItemId: string | null,
  workItemType: WorkItemType | null
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all test cases linked to this work item
  const {
    data: linkedCases,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['issue-test-cases', workItemId, workItemType],
    queryFn: async () => {
      if (!workItemId || !workItemType) return [];

      // Get links from test_case_work_item_links
      const { data: links, error: linksError } = await supabase
        .from('test_case_work_item_links')
        .select('id, case_id, linked_at')
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType)
        .order('linked_at', { ascending: false });

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const caseIds = links.map(l => l.case_id);

      // Fetch test case details
      const { data: cases, error: casesError } = await supabase
        .from('test_cases')
        .select('id, title, status, priority, test_type')
        .in('id', caseIds)
        .is('deleted_at', null);

      if (casesError) throw casesError;

      // Get latest executions for these cases
      const { data: executions } = await supabase
        .from('test_executions')
        .select('test_case_id, status, execution_date')
        .in('test_case_id', caseIds)
        .order('execution_date', { ascending: false });

      // Map to get latest execution per case
      const latestExecutions = new Map<string, { status: string; executed_at: string }>();
      executions?.forEach(exec => {
        if (!latestExecutions.has(exec.test_case_id)) {
          latestExecutions.set(exec.test_case_id, {
            status: exec.status || 'not_run',
            executed_at: exec.execution_date || '',
          });
        }
      });

      // Combine data
      const result: LinkedTestCase[] = [];
      for (const link of links) {
        const testCase = cases?.find(c => c.id === link.case_id);
        if (testCase) {
          const latestExec = latestExecutions.get(link.case_id);
          result.push({
            id: testCase.id,
            title: testCase.title,
            status: testCase.status,
            priority: testCase.priority,
            test_type: testCase.test_type,
            linked_at: link.linked_at,
            link_id: link.id,
            last_execution_status: latestExec?.status,
            last_executed_at: latestExec?.executed_at,
          });
        }
      }

      return result;
    },
    enabled: !!workItemId && !!workItemType && !!user,
  });

  // Search available test cases for linking
  const searchCases = async (programId: string, searchQuery: string): Promise<TestCaseForLinking[]> => {
    let query = supabase
      .from('test_cases')
      .select('id, title, status, priority, test_type, folder_id')
      .eq('program_id', programId)
      .is('deleted_at', null)
      .is('is_archived', false)
      .limit(20);

    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(c => ({
      id: c.id,
      title: c.title,
      status: c.status,
      priority: c.priority,
      test_type: c.test_type,
    }));
  };

  // Link an existing test case to this work item
  const linkCaseMutation = useMutation({
    mutationFn: async ({ caseId }: { caseId: string }) => {
      if (!user || !workItemId || !workItemType) {
        throw new Error('Missing required data');
      }

      // Check if already linked
      const { data: existing } = await supabase
        .from('test_case_work_item_links')
        .select('id')
        .eq('case_id', caseId)
        .eq('work_item_id', workItemId)
        .single();

      if (existing) {
        throw new Error('Test case is already linked');
      }

      const { data, error } = await supabase
        .from('test_case_work_item_links')
        .insert([{
          case_id: caseId,
          work_item_id: workItemId,
          work_item_type: workItemType,
          linked_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Get case title for audit
      const { data: testCase } = await supabase
        .from('test_cases')
        .select('title, program_id')
        .eq('id', caseId)
        .single();

      await logAuditEntry({
        entityType: 'test_case_work_item_links',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });

      await logTestActivity(
        user.id,
        'link_created',
        data.id,
        testCase?.title || 'Unknown',
        testCase?.program_id || null,
        `Linked to ${workItemType}`
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-test-cases', workItemId] });
      toast.success('Test case linked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Unlink a test case from this work item
  const unlinkCaseMutation = useMutation({
    mutationFn: async ({ linkId, caseId }: { linkId: string; caseId: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Get link data for audit
      const { data: linkData } = await supabase
        .from('test_case_work_item_links')
        .select('*')
        .eq('id', linkId)
        .single();

      const { error } = await supabase
        .from('test_case_work_item_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      await logAuditEntry({
        entityType: 'test_case_work_item_links',
        entityId: linkId,
        action: 'deleted',
        beforeData: linkData,
      });

      return linkId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-test-cases', workItemId] });
      toast.success('Test case unlinked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Create a new test case and link it to this work item
  const createCaseMutation = useMutation({
    mutationFn: async (input: CreateCaseFromIssueInput) => {
      if (!user) throw new Error('Not authenticated');

      // Create the test case
      const { data: newCase, error: caseError } = await supabase
        .from('test_cases')
        .insert([{
          title: input.title,
          description: input.description || null,
          preconditions: input.preconditions || null,
          expected_result: input.expected_result || null,
          priority: input.priority || 'medium',
          test_type: 'manual',
          status: 'draft',
          program_id: input.programId,
          created_by: user.id,
          linked_work_item_id: input.workItemId,
          linked_work_item_type: input.workItemType,
        }])
        .select()
        .single();

      if (caseError) throw caseError;

      // Create the link
      const { data: link, error: linkError } = await supabase
        .from('test_case_work_item_links')
        .insert([{
          case_id: newCase.id,
          work_item_id: input.workItemId,
          work_item_type: input.workItemType,
          linked_by: user.id,
        }])
        .select()
        .single();

      if (linkError) throw linkError;

      await logAuditEntry({
        entityType: 'test_cases',
        entityId: newCase.id,
        action: 'created',
        afterData: newCase,
      });

      await logTestActivity(
        user.id,
        'case_created',
        newCase.id,
        newCase.title,
        input.programId,
        `Created from ${input.workItemType}`
      );

      return newCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-test-cases', workItemId] });
      toast.success('Test case created and linked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    linkedCases: linkedCases || [],
    isLoading,
    error,
    refetch,
    searchCases,
    linkCase: linkCaseMutation.mutateAsync,
    unlinkCase: unlinkCaseMutation.mutateAsync,
    createCase: createCaseMutation.mutateAsync,
    isLinking: linkCaseMutation.isPending,
    isUnlinking: unlinkCaseMutation.isPending,
    isCreating: createCaseMutation.isPending,
  };
}

// Hook to add a test case to a set or cycle from the issue drawer
export function useAddCaseToCollection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addToSetMutation = useMutation({
    mutationFn: async ({ caseId, setId }: { caseId: string; setId: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if already in set
      const { data: existing } = await supabase
        .from('test_set_cases')
        .select('id')
        .eq('set_id', setId)
        .eq('case_id', caseId)
        .single();

      if (existing) {
        throw new Error('Case is already in this set');
      }

      const { data, error } = await supabase
        .from('test_set_cases')
        .insert([{
          set_id: setId,
          case_id: caseId,
          added_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-set-cases'] });
      toast.success('Case added to set');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addToCycleMutation = useMutation({
    mutationFn: async ({ caseId, cycleId }: { caseId: string; cycleId: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if already in cycle
      const { data: existing } = await supabase
        .from('test_executions')
        .select('id')
        .eq('test_cycle_id', cycleId)
        .eq('test_case_id', caseId)
        .single();

      if (existing) {
        throw new Error('Case is already in this cycle');
      }

      const { data, error } = await supabase
        .from('test_executions')
        .insert([{
          test_cycle_id: cycleId,
          test_case_id: caseId,
          status: 'not_run',
          executed_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycle-executions'] });
      toast.success('Case added to cycle');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    addToSet: addToSetMutation.mutateAsync,
    addToCycle: addToCycleMutation.mutateAsync,
    isAddingToSet: addToSetMutation.isPending,
    isAddingToCycle: addToCycleMutation.isPending,
  };
}
