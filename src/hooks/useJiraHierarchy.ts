import { useQuery } from '@tanstack/react-query';
import { fetchJiraHierarchyTree } from '@/services/jiraHierarchyService';

export function useJiraHierarchyTree(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['jira-hierarchy', projectKey],
    queryFn: () => fetchJiraHierarchyTree(projectKey!),
    enabled: !!projectKey,
    staleTime: 2 * 60_000,
  });
}
