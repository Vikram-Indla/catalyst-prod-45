/**
 * useBacklogUrlState — URL state sync for backlog filters (F1.28)
 *
 * Syncs work list filters with URL query parameters.
 */
import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useBacklogUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const syncSearchToUrl = useCallback((search: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (search) {
      newParams.set('search', search);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const syncGroupByToUrl = useCallback((groupBy: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (groupBy) {
      newParams.set('groupBy', groupBy);
    } else {
      newParams.delete('groupBy');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const getSearchFromUrl = useCallback((): string => {
    return searchParams.get('search') ?? '';
  }, [searchParams]);

  const getGroupByFromUrl = useCallback((): string | null => {
    return searchParams.get('groupBy');
  }, [searchParams]);

  const clearSearchFromUrl = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const debounceUrlUpdate = useCallback((updateFn: () => void, delay: number = 500) => {
    const timer = setTimeout(updateFn, delay);
    return () => clearTimeout(timer);
  }, []);

  return {
    syncSearchToUrl,
    syncGroupByToUrl,
    getSearchFromUrl,
    getGroupByFromUrl,
    clearSearchFromUrl,
    debounceUrlUpdate,
  };
}
