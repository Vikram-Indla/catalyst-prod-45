import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkItemVersion {
  id: string;
  work_item_id: string;
  work_item_type: string;
  release_id: string;
  link_type: 'fix' | 'affects';
  created_at: string;
  release?: {
    id: string;
    name: string;
    status: string;
    target_date: string | null;
  };
}

export function useWorkItemVersions(workItemId: string, workItemType: string) {
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['work-item-versions', workItemId, workItemType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_versions')
        .select(`
          id,
          work_item_id,
          work_item_type,
          release_id,
          link_type,
          created_at,
          releases:release_id (
            id,
            name,
            status,
            target_date
          )
        `)
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType);

      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        release: v.releases
      })) as WorkItemVersion[];
    },
    enabled: !!workItemId && !!workItemType,
  });

  const addVersion = useMutation({
    mutationFn: async ({ releaseId, linkType }: { releaseId: string; linkType: 'fix' | 'affects' }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('work_item_versions')
        .insert({
          work_item_id: workItemId,
          work_item_type: workItemType,
          release_id: releaseId,
          link_type: linkType,
          created_by: user?.user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-versions', workItemId, workItemType] });
    },
  });

  const removeVersion = useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase
        .from('work_item_versions')
        .delete()
        .eq('id', versionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-versions', workItemId, workItemType] });
    },
  });

  const fixVersions = versions.filter(v => v.link_type === 'fix');
  const affectsVersions = versions.filter(v => v.link_type === 'affects');

  return {
    versions,
    fixVersions,
    affectsVersions,
    isLoading,
    addVersion,
    removeVersion,
  };
}

export function useReleases() {
  return useQuery({
    queryKey: ['releases-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, name, status, target_date')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}
