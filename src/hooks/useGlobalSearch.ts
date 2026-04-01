import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SearchResult, RecentSearchEntry, ActiveFilters } from '@/types/global-search';

export function useRecentItems() {
  return useQuery({
    queryKey: ['global-search-recents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recently_viewed_items')
        .select('*')
        .order('viewed_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
  });
}

export function useRecentSearches() {
  return useQuery({
    queryKey: ['global-search-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_search_history')
        .select('id, query, searched_at')
        .order('searched_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as RecentSearchEntry[];
    },
  });
}

export function useSearchResults(query: string, filters: ActiveFilters) {
  return useQuery({
    queryKey: ['global-search-results', query, filters],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      let q = supabase
        .from('recently_viewed_items')
        .select('*')
        .or(`item_key.ilike.%${query}%,title.ilike.%${query}%`)
        .order('viewed_at', { ascending: false })
        .limit(20);
      if (filters.hub) q = q.eq('hub', filters.hub);
      if (filters.type) q = q.eq('item_type', filters.type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

export function useTrackView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: SearchResult) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('recently_viewed_items').upsert(
        {
          user_id: user.id,
          item_key: item.item_key,
          item_id: item.id,
          item_type: item.item_type,
          title: item.title,
          hub: item.hub,
          project_name: item.project_name,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,item_key' }
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['global-search-recents'] }),
  });
}

export function useSaveSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('global_search_history').insert({
        user_id: user.id,
        query,
      });
    },
  });
}
