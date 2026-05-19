/**
 * useSearchAssignees — Debounced search for assignees in Jira.
 *
 * Returns assignable users for the current project.
 * Debounced to prevent excessive API calls during rapid input.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';

export interface AssigneeOption {
  id: string;
  name: string;
  avatarUrl?: string;
  emailAddress?: string;
}

export function useSearchAssignees(projectKey?: string, query?: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['assignees', projectKey, debouncedQuery],
    enabled: !!projectKey && !!debouncedQuery,
    queryFn: async () => {
      if (!projectKey || !debouncedQuery) throw new Error('Project and query required');

      const response = await fetch(
        `/api/jira/assignees?projectKey=${projectKey}&query=${encodeURIComponent(
          debouncedQuery
        )}`
      );
      if (!response.ok) throw new Error('Failed to search assignees');

      return (await response.json()) as AssigneeOption[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
