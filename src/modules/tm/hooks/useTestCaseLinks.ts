// =====================================================
// TEST CASE LINKS HOOK - Simplified
// React Query hooks for test case linking operations
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LinkedItemType = 'story' | 'feature' | 'epic' | 'defect' | 'incident';

export interface LinkedItemWithDetails {
  id: string;
  test_case_id: string;
  linked_item_type: LinkedItemType;
  linked_item_id: string;
  item_key: string;
  item_title: string;
}

export interface LinkedItemDetails {
  id: string;
  key: string;
  title: string;
  status?: string;
}

export const testCaseLinkKeys = {
  all: ['tm_test_case_links'] as const,
  byTestCase: (testCaseId: string) => [...testCaseLinkKeys.all, testCaseId] as const,
};

// Get linked items for a test case (simplified - returns link data only)
export function useTestCaseLinks(testCaseId: string | null) {
  return useQuery({
    queryKey: testCaseLinkKeys.byTestCase(testCaseId || ''),
    queryFn: async (): Promise<LinkedItemWithDetails[]> => {
      if (!testCaseId) return [];

      const { data, error } = await supabase
        .from('tm_test_case_links')
        .select('*')
        .eq('test_case_id', testCaseId);

      if (error) throw error;

      // Return with placeholder details - can be enhanced later
      return (data || []).map((link) => ({
        id: link.id,
        test_case_id: link.test_case_id,
        linked_item_type: link.linked_item_type as LinkedItemType,
        linked_item_id: link.linked_item_id,
        item_key: link.linked_item_type.toUpperCase().slice(0, 3) + '-' + link.linked_item_id.slice(0, 4),
        item_title: `${link.linked_item_type} item`,
      }));
    },
    enabled: !!testCaseId,
  });
}

// Add a link to a test case
export function useAddTestCaseLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      testCaseId,
      linkedItemType,
      linkedItemId,
    }: {
      testCaseId: string;
      linkedItemType: LinkedItemType;
      linkedItemId: string;
    }) => {
      const { data, error } = await supabase
        .from('tm_test_case_links')
        .insert({
          test_case_id: testCaseId,
          linked_item_type: linkedItemType,
          linked_item_id: linkedItemId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: testCaseLinkKeys.byTestCase(variables.testCaseId),
      });
      toast.success('Item linked successfully');
    },
    onError: () => {
      toast.error('Failed to link item');
    },
  });
}

// Remove a link from a test case
export function useRemoveTestCaseLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, testCaseId }: { linkId: string; testCaseId: string }) => {
      const { error } = await supabase
        .from('tm_test_case_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: testCaseLinkKeys.byTestCase(variables.testCaseId),
      });
      toast.success('Link removed');
    },
    onError: () => {
      toast.error('Failed to remove link');
    },
  });
}
