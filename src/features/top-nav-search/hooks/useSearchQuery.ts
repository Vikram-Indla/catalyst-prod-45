import { useRecentItems, useSearchResults } from '@/hooks/useGlobalSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { mapResultToItem } from '../api/searchApi';
import type { SearchItem, SearchState } from '../types';

const EMPTY_FILTERS = { hub: null, project: null, assignee: null, type: null } as const;
const RECENT_LIMIT = 5;
const RESULTS_LIMIT = 8;

export function useSearchQuery(query: string): {
  items: SearchItem[];
  state: SearchState;
} {
  const debouncedQuery = useDebounce(query, 200);
  const isActive = debouncedQuery.length >= 2;

  const { data: recentData, isLoading: recentLoading } = useRecentItems();
  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching,
  } = useSearchResults(debouncedQuery, EMPTY_FILTERS);

  if (isActive) {
    const loading = searchLoading || isFetching;
    const items = (searchData ?? []).slice(0, RESULTS_LIMIT).map(mapResultToItem);
    const state: SearchState = loading
      ? 'loading'
      : items.length > 0
      ? 'results'
      : 'empty';
    return { items, state };
  }

  // query < 2 chars: show recent items
  const items = (recentData ?? []).slice(0, RECENT_LIMIT).map(mapResultToItem);
  const state: SearchState = recentLoading ? 'loading' : 'active';
  return { items, state };
}
