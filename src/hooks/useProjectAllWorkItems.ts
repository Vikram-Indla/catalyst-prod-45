import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export interface WorkItem {
  id: string;
  key: string;
  summary: string;
  type: string;
  status: string;
  priority: string;
  assignee?: string;
}

export interface Filters {
  status?: string;
  type?: string;
  priority?: string;
  assignee?: string;
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

export function useProjectAllWorkItems(
  projectKey: string,
  initialFilters?: Partial<Filters>
) {
  const [filters, setFilters] = useState<Filters>({
    status: initialFilters?.status,
    type: initialFilters?.type,
    priority: initialFilters?.priority,
    assignee: initialFilters?.assignee,
  });

  const [sort, setSort] = useState<Sort>({
    field: 'created',
    order: 'desc',
  });

  // Mock data fetcher (no real API calls)
  const fetchWorkItems = async (): Promise<WorkItem[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([]), 100);
    });
  };

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: [projectKey, filters, sort],
    queryFn: fetchWorkItems,
    retry: false,
  });

  return {
    items: data,
    filters,
    setFilters,
    sort,
    setSort,
    isLoading,
    error: error ?? null,
    refetch,
  };
}
