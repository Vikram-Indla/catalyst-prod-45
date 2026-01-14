// ============================================================
// TASK DETAIL DRAWER - MAIN COMPONENT
// Full-featured task detail slideout panel
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { DrawerHeader } from './DrawerHeader';
import { QuickActions } from './QuickActions';
import { TaskDescription } from './TaskDescription';
import { TaskFieldsGrid } from './TaskFieldsGrid';
import { DependenciesSection } from './DependenciesSection';
import { ChecklistSection } from './ChecklistSection';
import { AttachmentsSection } from './AttachmentsSection';
import { ActivitySection } from './ActivitySection';
import { DrawerFooter } from './DrawerFooter';

import {
  useTaskDependencies,
  useTaskChecklist,
  useTaskAttachments,
  useTaskComments,
  useTaskActivity,
} from '../../hooks/useTaskDetails';

interface TaskDetailDrawerProps {
  taskId?: string | null;
  task?: { id: string } | null; // Accept task object for backwards compat
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void; // Alias for onClose
  onTaskUpdated?: () => void;
}

// Hook to fetch single task with all related data
function useTaskDetail(taskId: string | null) {
  return useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
}

function useUpdateTaskField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, field, value }: { taskId: string; field: string; value: any }) => {
      const { error } = await supabase
        .from('planner_tasks')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });
}

export function TaskDetailDrawer({ taskId: propTaskId, task: propTask, open, onClose, onOpenChange, onTaskUpdated }: TaskDetailDrawerProps) {
  // Support both taskId and task.id for backwards compatibility
  const effectiveTaskId = propTaskId ?? propTask?.id ?? null;
  
  // Handle close - support both onClose and onOpenChange patterns
  const handleClose = useCallback(() => {
    onClose?.();
    onOpenChange?.(false);
  }, [onClose, onOpenChange]);

  const { data: task, isLoading } = useTaskDetail(effectiveTaskId);
  const updateField = useUpdateTaskField();
  const { data: dependencies } = useTaskDependencies(effectiveTaskId);
  const { data: checklist } = useTaskChecklist(effectiveTaskId);
  const { data: attachments } = useTaskAttachments(effectiveTaskId);
  const { data: comments } = useTaskComments(effectiveTaskId);
  const { data: activity } = useTaskActivity(effectiveTaskId);

  const handleFieldUpdate = useCallback(async (field: string, value: any) => {
    if (!effectiveTaskId) return;
    await updateField.mutateAsync({ taskId: effectiveTaskId, field, value });
    onTaskUpdated?.();
  }, [effectiveTaskId, updateField, onTaskUpdated]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'c':
          if (!e.metaKey && !e.ctrlKey) {
            navigator.clipboard.writeText(`${window.location.origin}/planner/task/${task?.key}`);
            toast.success('Link copied!');
          }
          break;
        case 'escape':
          onClose();
          break;
      }
    };
    
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, task, handleClose]);

  if (!effectiveTaskId) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[580px] p-0 gap-0 overflow-hidden"
      >
        {isLoading ? (
          <DrawerSkeleton />
        ) : task ? (
          <div className="flex flex-col h-full">
            {/* Header with gradient cover */}
            <DrawerHeader
              task={task}
              onClose={handleClose}
              onTitleChange={(title) => handleFieldUpdate('title', title)}
              onStatusChange={(statusId) => handleFieldUpdate('status_id', statusId)}
            />
            
            {/* Quick Actions */}
            <QuickActions taskId={effectiveTaskId!} taskKey={task.key} />
            
            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-6">
                {/* Description */}
                <TaskDescription
                  value={task.description || ''}
                  onChange={(desc) => handleFieldUpdate('description', desc)}
                />
                
                {/* Fields Grid */}
                <TaskFieldsGrid
                  task={task}
                  onFieldChange={handleFieldUpdate}
                />
                
                {/* Dependencies */}
                <DependenciesSection
                  taskId={effectiveTaskId!}
                  dependencies={dependencies || []}
                />
                
                {/* Checklist */}
                <ChecklistSection
                  taskId={effectiveTaskId!}
                  items={checklist || []}
                />
                
                {/* Attachments */}
                <AttachmentsSection
                  taskId={effectiveTaskId!}
                  attachments={attachments || []}
                />
                
                {/* Activity & Comments */}
                <ActivitySection
                  taskId={effectiveTaskId!}
                  comments={comments || []}
                  activity={activity || []}
                />
              </div>
            </ScrollArea>
            
            {/* Footer */}
            <DrawerFooter
              task={task}
              onDelete={() => {
                toast.success('Task deleted');
                handleClose();
              }}
              onDuplicate={() => {
                toast.success('Task duplicated');
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Task not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerSkeleton() {
  return (
    <div className="p-5 space-y-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
    </div>
  );
}
