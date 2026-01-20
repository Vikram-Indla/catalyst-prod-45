/**
 * Module 3A-4: Hook for searching defects with debounce
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DefectSearchResult, DefectSearchQuery } from '../types/defect-linking';

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface SearchResponse {
  results: DefectSearchResult[];
  count: number;
}

export function useDefectSearch(projectId: string | null, searchQuery: DefectSearchQuery) {
  const debouncedQuery = useDebouncedValue(searchQuery.query || '', 300);

  const query = useQuery({
    queryKey: ['defect-search', projectId, debouncedQuery, searchQuery.status],
    queryFn: async (): Promise<SearchResponse> => {
      if (!projectId) return { results: [], count: 0 };

      const { data, error } = await supabase
        .rpc('search_tm_defects', {
          p_project_id: projectId,
          p_query: debouncedQuery || null,
          p_status: searchQuery.status || null,
          p_limit: searchQuery.limit || 20,
        });

      if (error) throw error;

      const response = data as unknown as SearchResponse;
      return response;
    },
    enabled: !!projectId,
    staleTime: 10000,
  });

  return {
    results: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    isSearching: query.isLoading,
    error: query.error,
  };
}
