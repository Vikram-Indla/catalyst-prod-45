import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RaCategory } from '@/types/requirement-assist';

export function useRaCategories() {
  return useQuery({
    queryKey: ['ra-categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ra_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);

      // Build tree structure from flat list
      const map = new Map<string, RaCategory & { children: RaCategory[] }>();
      const roots: (RaCategory & { children: RaCategory[] })[] = [];

      (data as RaCategory[]).forEach(cat => {
        map.set(cat.id, { ...cat, children: [] });
      });

      map.forEach(cat => {
        if (cat.parent_id && map.has(cat.parent_id)) {
          map.get(cat.parent_id)!.children!.push(cat);
        } else {
          roots.push(cat);
        }
      });

      return roots;
    },
  });
}

export function useCreateRaCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; parent_id?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('ra_categories')
        .insert({ name: params.name, parent_id: params.parent_id ?? null, created_by: user.id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ra-categories'] });
    },
  });
}
