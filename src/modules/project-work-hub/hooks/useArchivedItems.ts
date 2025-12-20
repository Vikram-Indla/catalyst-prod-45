import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkItem, WorkItemType } from '../types';
import { toast } from '@/components/ui/sonner';

interface ArchivedItem {
  id: string;
  key: string;
  type: WorkItemType;
  summary: string;
  status: string;
  deletedAt: string;
}

export function useArchivedItems(projectId: string) {
  return useQuery({
    queryKey: ['archived-items', projectId],
    queryFn: async (): Promise<ArchivedItem[]> => {
      // Fetch archived features (deleted_at is not null)
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select('id, display_id, name, status, deleted_at')
        .eq('project_id', projectId)
        .not('deleted_at', 'is', null);

      if (featuresError) {
        console.error('Error fetching archived features:', featuresError);
      }

      const archivedFeatures: ArchivedItem[] = (features || []).map(f => ({
        id: f.id,
        key: f.display_id || `F-${f.id.slice(0, 4)}`,
        type: 'FEATURE' as WorkItemType,
        summary: f.name || 'Untitled Feature',
        status: f.status || 'backlog',
        deletedAt: f.deleted_at || '',
      }));

      // Get feature IDs for this project (including archived ones to find archived stories)
      const { data: allFeatures } = await supabase
        .from('features')
        .select('id')
        .eq('project_id', projectId);

      const featureIds = (allFeatures || []).map(f => f.id);

      // Fetch archived stories
      let archivedStories: ArchivedItem[] = [];
      if (featureIds.length > 0) {
        const { data: stories, error: storiesError } = await supabase
          .from('stories')
          .select('id, story_key, title, name, status, deleted_at, feature_id')
          .in('feature_id', featureIds)
          .not('deleted_at', 'is', null);

        if (storiesError) {
          console.error('Error fetching archived stories:', storiesError);
        }

        archivedStories = (stories || []).map(s => ({
          id: s.id,
          key: s.story_key || `S-${s.id.slice(0, 4)}`,
          type: 'STORY' as WorkItemType,
          summary: s.title || s.name || 'Untitled Story',
          status: s.status || 'todo',
          deletedAt: s.deleted_at || '',
        }));
      }

      return [...archivedFeatures, ...archivedStories].sort((a, b) => 
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      );
    },
  });
}

export function useRestoreItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: WorkItemType }) => {
      if (itemType === 'FEATURE') {
        const { error } = await supabase
          .from('features')
          .update({ deleted_at: null, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (error) throw error;
      } else if (itemType === 'STORY') {
        const { error } = await supabase
          .from('stories')
          .update({ deleted_at: null, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (error) throw error;
      } else {
        throw new Error('Unsupported item type for restore');
      }

      return { id: itemId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-items'] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Item restored successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to restore item', { description: error.message });
    },
  });
}

export function useSoftDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: WorkItemType }) => {
      const now = new Date().toISOString();

      if (itemType === 'FEATURE') {
        const { error } = await supabase
          .from('features')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', itemId);

        if (error) throw error;
      } else if (itemType === 'STORY') {
        const { error } = await supabase
          .from('stories')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', itemId);

        if (error) throw error;
      } else {
        throw new Error('Unsupported item type for delete');
      }

      return { id: itemId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-items'] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Item archived successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to archive item', { description: error.message });
    },
  });
}
