/**
 * CATALYST TESTS - Work Item Linking Hooks
 * React Query hooks for bidirectional test artifact linking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  WorkItemTestLink,
  WorkItemTestSummary,
  CreateTestFromWorkItemRequest,
  LinkTestToWorkItemRequest,
  AITestSuggestion,
} from '@/types/workItemLinking.types';
import type { TestCase } from '@/types/test-management';

// Query Keys
export const workItemLinkingKeys = {
  all: ['work-item-test-links'] as const,
  byWorkItem: (workItemId: string, workItemType: string) =>
    [...workItemLinkingKeys.all, 'work-item', workItemId, workItemType] as const,
  summary: (workItemId: string, workItemType: string) =>
    [...workItemLinkingKeys.all, 'summary', workItemId, workItemType] as const,
};

// ============================================
// FETCH WORK ITEM TEST LINKS
// ============================================

export const useWorkItemTestLinks = (workItemId: string, workItemType: string) => {
  return useQuery({
    queryKey: workItemLinkingKeys.byWorkItem(workItemId, workItemType),
    queryFn: async (): Promise<WorkItemTestLink[]> => {
      const { data, error } = await supabase
        .from('test_case_work_items')
        .select(`
          *,
          test_case:test_cases (*)
        `)
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkItemTestLink[];
    },
    enabled: !!workItemId && !!workItemType,
  });
};

// ============================================
// FETCH WORK ITEM TEST SUMMARY
// ============================================

export const useWorkItemTestSummary = (workItemId: string, workItemType: string) => {
  return useQuery({
    queryKey: workItemLinkingKeys.summary(workItemId, workItemType),
    queryFn: async (): Promise<WorkItemTestSummary> => {
      const { data: links, error: linksError } = await supabase
        .from('test_case_work_items')
        .select(`
          *,
          test_case:test_cases (*)
        `)
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType);

      if (linksError) throw linksError;

      const testCases = (links || []).map(link => link.test_case).filter(Boolean);
      
      const passedCount = testCases.filter((tc: any) => tc.status === 'approved').length;
      const failedCount = testCases.filter((tc: any) => tc.status === 'deprecated').length;
      const draftCount = testCases.filter((tc: any) => tc.status === 'draft').length;

      return {
        work_item_id: workItemId,
        work_item_type: workItemType as any,
        total_tests: testCases.length,
        test_cases: links as WorkItemTestLink[],
        test_cycles: [],
        passed_count: passedCount,
        failed_count: failedCount,
        draft_count: draftCount,
      };
    },
    enabled: !!workItemId && !!workItemType,
  });
};

// ============================================
// CREATE TEST FROM WORK ITEM
// ============================================

export const useCreateTestFromWorkItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: CreateTestFromWorkItemRequest): Promise<TestCase> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create test case
      const { data: testCase, error: testError } = await supabase
        .from('test_cases')
        .insert({
          title: request.title,
          description: request.description,
          test_type: request.test_type,
          priority: request.priority,
          status: 'draft',
          folder_id: request.folder_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (testError) throw testError;

      // Auto-link if requested
      if (request.auto_link) {
        const { error: linkError } = await supabase
          .from('test_case_work_items')
          .insert({
            test_case_id: testCase.id,
            work_item_id: request.work_item_id,
            work_item_type: request.work_item_type,
            link_type: 'covers',
            created_by: user.id,
          });

        if (linkError) throw linkError;
      }

      return testCase as TestCase;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workItemLinkingKeys.byWorkItem(variables.work_item_id, variables.work_item_type),
      });
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      toast({
        title: 'Test case created',
        description: 'Test case created and linked successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating test case',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ============================================
// LINK EXISTING TESTS TO WORK ITEM
// ============================================

export const useLinkTestsToWorkItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: LinkTestToWorkItemRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const links = request.test_case_ids.map(testCaseId => ({
        test_case_id: testCaseId,
        work_item_id: request.work_item_id,
        work_item_type: request.work_item_type,
        link_type: request.link_type,
        created_by: user.id,
      }));

      const { data, error } = await supabase
        .from('test_case_work_items')
        .insert(links)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workItemLinkingKeys.byWorkItem(variables.work_item_id, variables.work_item_type),
      });
      toast({
        title: 'Tests linked',
        description: `${variables.test_case_ids.length} test case(s) linked successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error linking tests',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ============================================
// UNLINK TEST FROM WORK ITEM
// ============================================

export const useUnlinkTestFromWorkItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      linkId,
      workItemId,
      workItemType,
    }: {
      linkId: string;
      workItemId: string;
      workItemType: string;
    }) => {
      const { error } = await supabase
        .from('test_case_work_items')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workItemLinkingKeys.byWorkItem(variables.workItemId, variables.workItemType),
      });
      toast({
        title: 'Test unlinked',
        description: 'Test case unlinked successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error unlinking test',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ============================================
// GENERATE AI TEST SUGGESTIONS
// ============================================

export const useGenerateAITestSuggestions = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      workItemId,
      workItemType,
      workItemTitle,
      workItemDescription,
    }: {
      workItemId: string;
      workItemType: string;
      workItemTitle: string;
      workItemDescription?: string;
    }): Promise<AITestSuggestion[]> => {
      // TODO: Integrate with Lovable AI for actual suggestions
      // For now, return mock suggestions based on work item type
      const suggestions: AITestSuggestion[] = [];

      if (workItemType === 'feature') {
        suggestions.push({
          title: `Test: ${workItemTitle} - Happy Path`,
          description: `Verify ${workItemTitle} works correctly with valid inputs`,
          steps: [
            { action: 'Navigate to feature', expected_result: 'Feature page loads' },
            { action: 'Enter valid data', expected_result: 'Data accepted' },
            { action: 'Submit form', expected_result: 'Success message displayed' },
          ],
          expected_result: 'Feature completes successfully',
          test_type: 'manual',
          priority: 'high',
        });

        suggestions.push({
          title: `Test: ${workItemTitle} - Error Handling`,
          description: `Verify ${workItemTitle} handles errors gracefully`,
          steps: [
            { action: 'Navigate to feature', expected_result: 'Feature page loads' },
            { action: 'Enter invalid data', expected_result: 'Validation error shown' },
            { action: 'Correct data and submit', expected_result: 'Success' },
          ],
          expected_result: 'Errors handled appropriately',
          test_type: 'manual',
          priority: 'medium',
        });
      }

      if (workItemType === 'defect') {
        suggestions.push({
          title: `Test: Reproduce ${workItemTitle}`,
          description: `Reproduce the defect: ${workItemDescription}`,
          steps: [
            { action: 'Follow reproduction steps', expected_result: 'Defect reproduced' },
            { action: 'Verify fix applied', expected_result: 'Defect no longer occurs' },
          ],
          expected_result: 'Defect is resolved',
          test_type: 'manual',
          priority: 'critical',
        });
      }

      return suggestions;
    },
    onError: (error) => {
      toast({
        title: 'Error generating suggestions',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
