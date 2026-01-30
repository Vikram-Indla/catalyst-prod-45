// ============================================================================
// HOOK: useTaskLabels — Manage labels for a specific task
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '../types/labels';
import { useToast } from '@/hooks/use-toast';

export const useTaskLabels = (taskId: string) => {
  const [taskLabels, setTaskLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch labels for this task
  const fetchTaskLabels = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const { data, error } = await supabase
        .from('planner_task_labels')
        .select(`
          label_id,
          planner_labels (
            id,
            name,
            color,
            description
          )
        `)
        .eq('task_id', taskId);

      if (error) throw error;

      const labels = data
        ?.map(item => item.planner_labels as unknown as Label)
        .filter(Boolean) || [];
      
      setTaskLabels(labels);
    } catch (error) {
      console.error('Error fetching task labels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  // Add label to task
  const addLabel = async (labelId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('planner_task_labels')
        .insert({
          task_id: taskId,
          label_id: labelId,
          assigned_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          // Already assigned
          return true;
        }
        throw error;
      }

      // Fetch the label details to add to state
      const { data: labelData } = await supabase
        .from('planner_labels')
        .select('*')
        .eq('id', labelId)
        .single();

      if (labelData) {
        setTaskLabels(prev => [...prev, labelData]);
      }

      return true;
    } catch (error) {
      console.error('Error adding label:', error);
      toast({ title: 'Error', description: 'Failed to add label', variant: 'destructive' });
      return false;
    }
  };

  // Remove label from task
  const removeLabel = async (labelId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('planner_task_labels')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId);

      if (error) throw error;

      setTaskLabels(prev => prev.filter(l => l.id !== labelId));
      return true;
    } catch (error) {
      console.error('Error removing label:', error);
      toast({ title: 'Error', description: 'Failed to remove label', variant: 'destructive' });
      return false;
    }
  };

  // Toggle label (add if not present, remove if present)
  const toggleLabel = async (label: Label): Promise<boolean> => {
    const isAssigned = taskLabels.some(l => l.id === label.id);
    
    if (isAssigned) {
      return removeLabel(label.id);
    } else {
      return addLabel(label.id);
    }
  };

  useEffect(() => {
    fetchTaskLabels();
  }, [fetchTaskLabels]);

  return {
    taskLabels,
    isLoading,
    addLabel,
    removeLabel,
    toggleLabel,
    refetch: fetchTaskLabels
  };
};

export default useTaskLabels;
