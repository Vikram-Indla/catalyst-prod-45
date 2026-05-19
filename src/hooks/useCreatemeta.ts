/**
 * useCreatemeta — Fetch Jira createmeta for inline issue creation.
 *
 * Returns issue types and field metadata for a given project.
 * Used by InlineCreateCard to populate type picker and validate fields.
 *
 * Caches result per project key via React Query.
 */

import { useQuery } from '@tanstack/react-query';

export interface CreatemetaIssueType {
  id: string;
  name: string;
  subtask?: boolean;
}

export interface CreatemetaProject {
  key: string;
  name: string;
  issuetypes: CreatemetaIssueType[];
}

export interface CreatemetaResponse {
  projects: CreatemetaProject[];
}

export function useCreatemeta(projectKey?: string) {
  return useQuery({
    queryKey: ['createmeta', projectKey],
    enabled: !!projectKey,
    queryFn: async () => {
      if (!projectKey) throw new Error('Project key required');

      const response = await fetch(
        `/api/jira/createmeta?projectKey=${projectKey}`
      );
      if (!response.ok) throw new Error('Failed to fetch createmeta');

      return (await response.json()) as CreatemetaResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
