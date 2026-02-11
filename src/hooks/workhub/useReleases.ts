/**
 * WorkHub Releases Hooks — TanStack Query
 * CRUD operations + progress aggregation for wh_releases
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Release, ReleaseProgress } from '@/types/workhub.types';
import { catalystToast } from '@/components/ui/CatalystToast';

/** Hook A — All releases, ordered by sort_order then target_date */
export function useWHReleases() {
  return useQuery({
    queryKey: ['workhub', 'releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_releases')
        .select('*')
        .order('sort_order')
        .order('target_date');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Release[];
    },
    staleTime: 30_000,
  });
}

/** Hook B — Single release by ID */
export function useRelease(id: string) {
  return useQuery({
    queryKey: ['workhub', 'release', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_releases')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Release;
    },
    enabled: !!id,
  });
}

/** Hook C — All release progress (from aggregated view) */
export function useReleaseProgress() {
  return useQuery({
    queryKey: ['workhub', 'release-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_wh_release_progress')
        .select('*')
        .order('target_date');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ReleaseProgress[];
    },
    staleTime: 30_000,
  });
}

/** Hook D — Single release progress by ID */
export function useReleaseProgressById(id: string) {
  return useQuery({
    queryKey: ['workhub', 'release-progress', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_wh_release_progress')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ReleaseProgress;
    },
    enabled: !!id,
  });
}

/** Hook E — Create release */
export function useCreateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newRelease: Partial<Release>) => {
      const { data, error } = await supabase
        .from('wh_releases')
        .insert(newRelease as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'releases'] });
      qc.invalidateQueries({ queryKey: ['workhub', 'release-progress'] });
      catalystToast.success('Release created');
    },
    onError: (err: Error) => {
      catalystToast.error(err.message);
    },
  });
}

/** Hook F — Update release */
export function useUpdateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Release> }) => {
      const { error } = await supabase
        .from('wh_releases')
        .update(updates as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success('Release updated');
    },
    onError: (err: Error) => {
      catalystToast.error(err.message);
    },
  });
}

/** Hook G — Delete release (unlink work items first) */
export function useDeleteRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Unlink work items
      await supabase
        .from('wh_work_items')
        .update({ release_id: null } as any)
        .eq('release_id', id);
      // Delete release
      const { error } = await supabase
        .from('wh_releases')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      catalystToast.success('Release deleted');
    },
    onError: (err: Error) => {
      catalystToast.error(err.message);
    },
  });
}
