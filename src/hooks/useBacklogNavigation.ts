/**
 * useBacklogNavigation — Navigation hook for backlog page (F1.27)
 *
 * Provides utilities for navigating backlog and managing URL state.
 */
import { useNavigate, useSearchParams } from 'react-router-dom';

export interface BacklogFilters {
  status?: string;
  search?: string;
  groupBy?: string;
}

export function useBacklogNavigation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const navigateToBacklog = (filters?: BacklogFilters) => {
    const url = getBacklogUrl(filters);
    navigate(url);
  };

  const getBacklogUrl = (filters?: BacklogFilters): string => {
    const baseUrl = '/workitems';
    if (!filters) return baseUrl;

    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.groupBy) params.append('groupBy', filters.groupBy);

    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  const getCurrentFilters = (): BacklogFilters => {
    return {
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      groupBy: searchParams.get('groupBy') ?? undefined,
    };
  };

  const getGroupByOptions = (): string[] => {
    return ['status', 'priority', 'assignee', 'type'];
  };

  return {
    navigateToBacklog,
    getBacklogUrl,
    getCurrentFilters,
    getGroupByOptions,
  };
}
