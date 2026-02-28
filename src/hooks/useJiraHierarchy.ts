import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJiraHierarchyTree, saveHierarchyOverride } from '@/services/jiraHierarchyService';

export function useJiraHierarchyTree(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['jira-hierarchy', projectKey],
    queryFn: () => fetchJiraHierarchyTree(projectKey!),
    enabled: !!projectKey,
    staleTime: 2 * 60_000,
  });
}

export function useMoveJiraHierarchyItem(projectKey: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueKey, newParentKey, originalParentKey }: {
      issueKey: string;
      newParentKey: string | null;
      originalParentKey: string | null;
    }) => {
      if (!projectKey) throw new Error('No project key');
      await saveHierarchyOverride(projectKey, issueKey, newParentKey, originalParentKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-hierarchy', projectKey] });
    },
  });
}
