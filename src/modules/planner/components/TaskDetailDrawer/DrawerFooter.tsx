// ============================================================
// DRAWER FOOTER - POLISHED
// Visible Duplicate/Delete buttons with actual implementations
// NO TOASTS - silent operations as per guardrail
// ============================================================

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Trash2, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DrawerFooterProps {
  task: any;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function DrawerFooter({ task, onDelete, onDuplicate }: DrawerFooterProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      // Soft delete via backend function (bypasses RLS edge-cases)
      const { error } = await supabase
        .rpc('soft_delete_planner_task', { p_task_id: task.id });

      if (error) throw error;

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      
      setShowDeleteConfirm(false);
      onDelete();
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (isDuplicating) return;
    setIsDuplicating(true);

    try {
      // Generate new key
      const { data: lastTask } = await supabase
        .from('planner_tasks')
        .select('key')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastNum = lastTask?.key ? parseInt(lastTask.key.replace(/\D/g, '')) || 0 : 0;
      const newKey = `TASK-${lastNum + 1}`;

      // Clone task without id, key, timestamps
      const { error } = await supabase
        .from('planner_tasks')
        .insert([{
          title: `${task.title} (Copy)`,
          description: task.description,
          status_id: task.status_id,
          workstream_id: task.workstream_id,
          assignee_id: task.assignee_id,
          priority: task.priority,
          due_date: task.due_date,
          start_date: task.start_date,
          key: newKey,
          task_key: newKey,
          position: task.position + 1,
        }]);

      if (error) throw error;

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      
      onDuplicate();
    } catch (error) {
      console.error('Failed to duplicate task:', error);
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <>
      <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
        {/* Meta */}
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <div>
            Created <span className="text-foreground font-medium">{format(new Date(task.created_at), 'MMM d, yyyy')}</span>
          </div>
          <div>
            Updated <span className="text-foreground font-medium">{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Actions - Visible buttons, NOT a menu */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={handleDuplicate}
            disabled={isDuplicating}
          >
            {isDuplicating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1.5" />
            )}
            Duplicate
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
            disabled={isDeleting}
            onClick={() => setShowDeleteConfirm(true)}
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog - Outside the Sheet for proper z-index */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move "{task.title}" to trash. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
