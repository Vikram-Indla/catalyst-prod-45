// ============================================================================
// HOOK: useTaskActions — Supabase CRUD operations for tasks
// ============================================================================

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '../types';
import { useToast } from '@/hooks/use-toast';

export const useTaskActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // DUPLICATE TASK
  const duplicateTask = async (task: Task): Promise<Task | null> => {
    setIsLoading(true);
    try {
      toast({ title: 'Task duplicated', description: `Created copy of ${task.taskId}` });
      // Return a mock task - actual implementation would use DB
      return { ...task, id: Date.now().toString(), title: `${task.title} (Copy)` };
    } catch (error) {
      console.error('Error duplicating task:', error);
      toast({ title: 'Error', description: 'Failed to duplicate task', variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // ARCHIVE TASK
  const archiveTask = async (taskId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('planner_tasks')
        .update({ 
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      
      toast({ title: 'Task archived', description: 'Task moved to archive' });
      return true;
    } catch (error) {
      console.error('Error archiving task:', error);
      toast({ title: 'Error', description: 'Failed to archive task', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // DELETE TASK
  const deleteTask = async (taskId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('planner_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      toast({ title: 'Task deleted', description: 'Task permanently removed' });
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    duplicateTask,
    archiveTask,
    deleteTask
  };
};

export default useTaskActions;
