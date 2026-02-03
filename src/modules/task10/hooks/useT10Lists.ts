import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10List } from '../types';

interface DbT10List {
  id: string;
  list_key: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbToT10List(db: DbT10List): T10List {
  return {
    id: db.id,
    key: db.list_key,
    name: db.name,
    status: db.status as 'active' | 'inactive',
    created_by: db.created_by || '',
    created_by_name: '', // Will be populated from profile join
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

export function useT10Lists() {
  return useQuery({
    queryKey: ['t10-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t10_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapDbToT10List);
    },
  });
}

export function useT10ListById(listId: string | undefined) {
  return useQuery({
    queryKey: ['t10-lists', listId],
    queryFn: async () => {
      if (!listId) return null;
      const { data, error } = await supabase
        .from('t10_lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (error) throw error;
      return mapDbToT10List(data);
    },
    enabled: !!listId,
  });
}

export function useCreateT10List() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Generate a unique key
      const { data: existingLists } = await supabase
        .from('t10_lists')
        .select('list_key')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextKey = 'T10-001';
      if (existingLists && existingLists.length > 0) {
        const lastKey = existingLists[0].list_key;
        const lastNum = parseInt(lastKey.replace('T10-', ''), 10);
        nextKey = `T10-${String(lastNum + 1).padStart(3, '0')}`;
      }

      const { data, error } = await supabase
        .from('t10_lists')
        .insert({
          list_key: nextKey,
          name,
          status: 'active',
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbToT10List(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
    },
  });
}

export function useRenameT10List() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, name }: { listId: string; name: string }) => {
      const { data, error } = await supabase
        .from('t10_lists')
        .update({ name })
        .eq('id', listId)
        .select()
        .single();

      if (error) throw error;
      return mapDbToT10List(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
    },
  });
}

export function useDeleteT10List() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('t10_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
    },
  });
}
