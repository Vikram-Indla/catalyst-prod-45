/**
 * useWorkItems — Fetch work items (F1.21)
 *
 * Fetches work items from database with loading and error states.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface WorkItem {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
}

export interface UseWorkItemsOptions {
  enabled?: boolean;
}

export interface UseWorkItemsResult {
  items: WorkItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  itemCount: number;
}

export function useWorkItems(options: UseWorkItemsOptions = {}): UseWorkItemsResult {
  const { enabled = true } = options;

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['workItems'],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type, status')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      return (data || []) as WorkItem[];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    items: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: () => refetch(),
    itemCount: data.length,
  };
}
