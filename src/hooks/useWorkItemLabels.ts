import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkItemLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
}

type EntityType = 'epic' | 'feature' | 'story';

export function useWorkItemLabels(entityType: EntityType, entityId: string) {
  const queryClient = useQueryClient();

  // Fetch all available labels
  const { data: allLabels = [], isLoading: isLoadingLabels } = useQuery({
    queryKey: ['work-item-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_labels')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as WorkItemLabel[];
    },
  });

  // Fetch assigned labels for this entity
  const { data: assignedLabels = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['work-item-label-assignments', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_label_assignments')
        .select('label_id, work_item_labels(*)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      if (error) throw error;
      return data
        .map(a => a.work_item_labels)
        .filter(Boolean) as WorkItemLabel[];
    },
    enabled: !!entityId,
  });

  // Assign a label
  const assignLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('work_item_label_assignments')
        .insert({
          label_id: labelId,
          entity_type: entityType,
          entity_id: entityId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['work-item-label-assignments', entityType, entityId] 
      });
      toast.success('Label assigned');
    },
    onError: () => {
      toast.error('Failed to assign label');
    },
  });

  // Remove a label
  const removeLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('work_item_label_assignments')
        .delete()
        .eq('label_id', labelId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['work-item-label-assignments', entityType, entityId] 
      });
      toast.success('Label removed');
    },
    onError: () => {
      toast.error('Failed to remove label');
    },
  });

  // Toggle label assignment
  const toggleLabel = (labelId: string) => {
    const isAssigned = assignedLabels.some(l => l.id === labelId);
    if (isAssigned) {
      removeLabel.mutate(labelId);
    } else {
      assignLabel.mutate(labelId);
    }
  };

  return {
    allLabels,
    assignedLabels,
    isLoading: isLoadingLabels || isLoadingAssignments,
    assignLabel: assignLabel.mutate,
    removeLabel: removeLabel.mutate,
    toggleLabel,
    isPending: assignLabel.isPending || removeLabel.isPending,
  };
}

// Hook for managing labels (create, update, delete)
export function useManageLabels() {
  const queryClient = useQueryClient();

  const createLabel = useMutation({
    mutationFn: async (label: { name: string; color: string; description?: string }) => {
      const { data, error } = await supabase
        .from('work_item_labels')
        .insert(label)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-labels'] });
      toast.success('Label created');
    },
    onError: () => {
      toast.error('Failed to create label');
    },
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkItemLabel> & { id: string }) => {
      const { error } = await supabase
        .from('work_item_labels')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-labels'] });
      toast.success('Label updated');
    },
    onError: () => {
      toast.error('Failed to update label');
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_item_labels')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-labels'] });
      toast.success('Label deleted');
    },
    onError: () => {
      toast.error('Failed to delete label');
    },
  });

  return {
    createLabel: createLabel.mutate,
    updateLabel: updateLabel.mutate,
    deleteLabel: deleteLabel.mutate,
    isCreating: createLabel.isPending,
    isUpdating: updateLabel.isPending,
    isDeleting: deleteLabel.isPending,
  };
}
